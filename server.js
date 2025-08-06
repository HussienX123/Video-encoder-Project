const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
const tempDir = path.join(__dirname, 'temp');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputDir);
fs.ensureDirSync(tempDir);

// Serve static files (converted videos)
app.use('/videos', express.static(outputDir));
app.use('/temp', express.static(tempDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// Store conversion jobs
const conversionJobs = new Map();

// Helper function to convert video to 480p
function convertTo480p(inputPath, outputPath, jobId) {
  return new Promise((resolve, reject) => {
    console.log(`Starting conversion for job ${jobId}: ${inputPath} -> ${outputPath}`);
    
    conversionJobs.set(jobId, { status: 'processing', progress: 0 });
    
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('854x480') // 480p resolution
      .videoBitrate('1000k')
      .audioBitrate('128k')
      .fps(30)
      .format('mp4')
      .on('progress', (progress) => {
        const percent = Math.round(progress.percent || 0);
        conversionJobs.set(jobId, { status: 'processing', progress: percent });
        console.log(`Job ${jobId} progress: ${percent}%`);
      })
      .on('end', () => {
        conversionJobs.set(jobId, { status: 'completed', progress: 100 });
        console.log(`Job ${jobId} completed successfully`);
        resolve();
      })
      .on('error', (err) => {
        conversionJobs.set(jobId, { status: 'error', progress: 0, error: err.message });
        console.error(`Job ${jobId} failed:`, err);
        reject(err);
      })
      .save(outputPath);
  });
}

// Helper function to download video from URL
function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg(url)
      .format('mp4')
      .on('end', () => {
        console.log('Download completed');
        resolve();
      })
      .on('error', (err) => {
        console.error('Download failed:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Video Encoder & Streaming Server</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, button { padding: 10px; margin: 5px 0; }
            input[type="text"], input[type="url"] { width: 100%; }
            button { background-color: #007bff; color: white; border: none; cursor: pointer; }
            button:hover { background-color: #0056b3; }
            .result { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
            .error { background-color: #f8d7da; color: #721c24; }
            .success { background-color: #d4edda; color: #155724; }
            .video-container { margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>Video Encoder & Streaming Server</h1>
        
        <h2>Convert Video from URL</h2>
        <form id="urlForm">
            <div class="form-group">
                <label for="videoUrl">Video URL (e.g., .mp4, .avi, .mkv):</label>
                <input type="url" id="videoUrl" name="videoUrl" required 
                       placeholder="https://example.com/video.mp4">
            </div>
            <button type="submit">Convert & Stream</button>
        </form>

        <h2>Upload Video File</h2>
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="videoFile">Select Video File:</label>
                <input type="file" id="videoFile" name="video" accept="video/*" required>
            </div>
            <button type="submit">Upload & Convert</button>
        </form>

        <div id="result"></div>

        <script>
            document.getElementById('urlForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const videoUrl = document.getElementById('videoUrl').value;
                const resultDiv = document.getElementById('result');
                
                resultDiv.innerHTML = '<p>Processing video from URL...</p>';
                
                try {
                    const response = await fetch('/convert-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: videoUrl })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        pollJobStatus(data.jobId, resultDiv);
                    } else {
                        resultDiv.innerHTML = '<div class="result error">Error: ' + data.error + '</div>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="result error">Error: ' + error.message + '</div>';
                }
            });

            document.getElementById('uploadForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData();
                const fileInput = document.getElementById('videoFile');
                formData.append('video', fileInput.files[0]);
                
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '<p>Uploading and processing video...</p>';
                
                try {
                    const response = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        pollJobStatus(data.jobId, resultDiv);
                    } else {
                        resultDiv.innerHTML = '<div class="result error">Error: ' + data.error + '</div>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="result error">Error: ' + error.message + '</div>';
                }
            });

            function pollJobStatus(jobId, resultDiv) {
                const pollInterval = setInterval(async () => {
                    try {
                        const response = await fetch('/status/' + jobId);
                        const data = await response.json();
                        
                        if (data.status === 'processing') {
                            resultDiv.innerHTML = '<p>Converting... ' + data.progress + '%</p>';
                        } else if (data.status === 'completed') {
                            clearInterval(pollInterval);
                            resultDiv.innerHTML = 
                                '<div class="result success">' +
                                '<p>Conversion completed successfully!</p>' +
                                '<div class="video-container">' +
                                '<h3>Streaming Video (480p):</h3>' +
                                '<video controls width="100%" style="max-width: 640px;">' +
                                '<source src="' + data.streamUrl + '" type="video/mp4">' +
                                'Your browser does not support the video tag.' +
                                '</video>' +
                                '<p><a href="' + data.downloadUrl + '" target="_blank">Download 480p Video</a></p>' +
                                '</div>' +
                                '</div>';
                        } else if (data.status === 'error') {
                            clearInterval(pollInterval);
                            resultDiv.innerHTML = '<div class="result error">Conversion failed: ' + data.error + '</div>';
                        }
                    } catch (error) {
                        clearInterval(pollInterval);
                        resultDiv.innerHTML = '<div class="result error">Error checking status: ' + error.message + '</div>';
                    }
                }, 2000);
            }
        </script>
    </body>
    </html>
  `);
});

// Convert video from URL
app.post('/convert-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const jobId = uuidv4();
    const tempFileName = `temp-${jobId}.mp4`;
    const tempPath = path.join(tempDir, tempFileName);
    const outputFileName = `converted-${jobId}-480p.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    // Start the conversion process asynchronously
    (async () => {
      try {
        console.log(`Downloading video from URL: ${url}`);
        await downloadVideo(url, tempPath);
        
        console.log(`Converting video to 480p: ${tempPath} -> ${outputPath}`);
        await convertTo480p(tempPath, outputPath, jobId);
        
        // Clean up temp file
        await fs.remove(tempPath);
        
        console.log(`Job ${jobId} completed successfully`);
      } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        conversionJobs.set(jobId, { status: 'error', progress: 0, error: error.message });
      }
    })();

    res.json({ 
      success: true, 
      jobId: jobId,
      message: 'Video conversion started. Check status endpoint for progress.' 
    });

  } catch (error) {
    console.error('Error in convert-url:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload and convert video file
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file uploaded' });
    }

    const jobId = uuidv4();
    const inputPath = req.file.path;
    const outputFileName = `converted-${jobId}-480p.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    // Start conversion asynchronously
    (async () => {
      try {
        await convertTo480p(inputPath, outputPath, jobId);
        
        // Clean up uploaded file
        await fs.remove(inputPath);
        
        console.log(`Job ${jobId} completed successfully`);
      } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        conversionJobs.set(jobId, { status: 'error', progress: 0, error: error.message });
      }
    })();

    res.json({ 
      success: true, 
      jobId: jobId,
      message: 'Video conversion started. Check status endpoint for progress.' 
    });

  } catch (error) {
    console.error('Error in upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check conversion status
app.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = conversionJobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  
  const response = { ...job };
  
  if (job.status === 'completed') {
    const outputFileName = `converted-${jobId}-480p.mp4`;
    response.streamUrl = `/videos/${outputFileName}`;
    response.downloadUrl = `/videos/${outputFileName}`;
  }
  
  res.json(response);
});

// Stream video endpoint (alternative streaming method)
app.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  const outputFileName = `converted-${jobId}-480p.mp4`;
  const videoPath = path.join(outputDir, outputFileName);
  
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Get list of converted videos
app.get('/api/videos', async (req, res) => {
  try {
    const files = await fs.readdir(outputDir);
    const videoFiles = files.filter(file => file.endsWith('.mp4'));
    
    const videos = videoFiles.map(file => ({
      filename: file,
      url: `/videos/${file}`,
      streamUrl: `/stream/${file.replace('converted-', '').replace('-480p.mp4', '')}`
    }));
    
    res.json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 500MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Video Encoder & Streaming Server running on port ${PORT}`);
  console.log(`Access the web interface at: http://localhost:${PORT}`);
  console.log('Make sure FFmpeg is installed on your system!');
});

module.exports = app;
