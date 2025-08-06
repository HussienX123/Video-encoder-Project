# Video Encoder & Streaming Server

A Node.js application that converts videos to 480p resolution and streams them online. Perfect for self-hosting on cloud servers with fast internet connections.

## Features

- **Video URL Processing**: Convert videos directly from URLs (supports .mp4, .avi, .mkv, etc.)
- **File Upload**: Upload and convert local video files
- **480p Conversion**: Automatically converts videos to 854x480 resolution with optimized bitrate
- **Real-time Streaming**: Stream converted videos directly in the browser
- **Progress Tracking**: Real-time conversion progress updates
- **Web Interface**: User-friendly web interface for easy operation
- **REST API**: Complete API for programmatic access
- **Range Requests**: Supports video seeking and progressive loading

## Prerequisites

1. **Node.js** (v14 or higher)
2. **FFmpeg** - Must be installed on your system
   - Windows: Download from https://ffmpeg.org/download.html
   - Linux: `sudo apt install ffmpeg` (Ubuntu/Debian) or `sudo yum install ffmpeg` (CentOS/RHEL)
   - macOS: `brew install ffmpeg`

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Verify FFmpeg installation:
   ```bash
   ffmpeg -version
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3000 (or the port specified in PORT environment variable).

Access the web interface at: `http://localhost:3000`

## API Endpoints

### Convert Video from URL
```http
POST /convert-url
Content-Type: application/json

{
  "url": "https://example.com/video.mp4"
}
```

### Upload Video File
```http
POST /upload
Content-Type: multipart/form-data

video: [video file]
```

### Check Conversion Status
```http
GET /status/:jobId
```

### Stream Video
```http
GET /videos/:filename
GET /stream/:jobId
```

### List All Videos
```http
GET /api/videos
```

### Health Check
```http
GET /health
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Video Conversion Settings

The application converts videos with these settings:
- **Resolution**: 854x480 (480p)
- **Video Codec**: H.264 (libx264)
- **Audio Codec**: AAC
- **Video Bitrate**: 1000k
- **Audio Bitrate**: 128k
- **Frame Rate**: 30 fps
- **Format**: MP4

You can modify these settings in the `convertTo480p` function in `server.js`.

## Directory Structure

```
project/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── uploads/           # Temporary uploaded files
├── output/            # Converted video files
└── temp/              # Temporary download files
```

## File Size Limits

- Maximum upload size: 500MB
- This can be modified in the multer configuration

## Deployment on Cloud Server

1. **Install Node.js and FFmpeg** on your cloud server
2. **Clone the project** to your server
3. **Install dependencies**: `npm install`
4. **Set environment variables**:
   ```bash
   export PORT=80
   export NODE_ENV=production
   ```
5. **Start the application**:
   ```bash
   npm start
   ```

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start server.js --name "video-encoder"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Nginx Reverse Proxy (Optional)

For production deployment, you might want to use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Considerations

- The application includes basic security headers via Helmet
- File upload validation for video files only
- File size limits to prevent abuse
- Consider adding authentication for production use
- Use HTTPS in production

## Troubleshooting

### FFmpeg Not Found
- Ensure FFmpeg is installed and accessible in your system PATH
- Test with: `ffmpeg -version`

### Large File Uploads
- Increase the file size limit in the multer configuration
- Consider server disk space and bandwidth

### Performance Issues
- Monitor CPU usage during video conversion
- Consider implementing a job queue for multiple concurrent conversions
- Adjust video quality settings for better performance vs. quality balance

## License

MIT License

## Support

For issues and questions, please check the troubleshooting section or create an issue in the project repository.
