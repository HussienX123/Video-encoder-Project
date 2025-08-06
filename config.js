// Configuration file for video encoder settings
module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Video Conversion Settings
  video: {
    // Output resolution (480p)
    resolution: {
      width: 854,
      height: 480
    },
    
    // Bitrate settings
    videoBitrate: '1000k',  // Video bitrate
    audioBitrate: '128k',   // Audio bitrate
    
    // Codec settings
    videoCodec: 'libx264',  // H.264 codec
    audioCodec: 'aac',      // AAC audio codec
    
    // Frame rate
    fps: 30,
    
    // Output format
    format: 'mp4',
    
    // Quality settings (you can experiment with these)
    crf: 23,  // Constant Rate Factor (lower = better quality, larger file)
    preset: 'medium', // Encoding speed preset (ultrafast, fast, medium, slow, veryslow)
    
    // Additional FFmpeg options
    additionalOptions: [
      '-movflags', '+faststart', // Enable fast start for web streaming
      '-profile:v', 'baseline',  // H.264 baseline profile for compatibility
      '-level', '3.0'            // H.264 level 3.0
    ]
  },

  // File Upload Settings
  upload: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedFormats: [
      'video/mp4',
      'video/avi', 
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/webm',
      'video/x-flv',
      'video/3gpp',
      'video/x-matroska'
    ],
    tempDir: 'temp',
    uploadDir: 'uploads',
    outputDir: 'output'
  },

  // Security Settings
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 10, // Limit each IP to 10 requests per windowMs
    helmetConfig: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          mediaSrc: ["'self'", "blob:", "data:"]
        }
      }
    }
  },

  // Cleanup Settings
  cleanup: {
    autoCleanup: true,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    maxFileAge: 24 * 60 * 60 * 1000, // 24 hours
    cleanupOnStartup: true
  },

  // Logging Settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined', // Morgan logging format
    logToFile: false,
    logDirectory: 'logs'
  },

  // Advanced Video Settings (for different quality presets)
  presets: {
    '240p': {
      resolution: { width: 426, height: 240 },
      videoBitrate: '400k',
      audioBitrate: '64k'
    },
    '360p': {
      resolution: { width: 640, height: 360 },
      videoBitrate: '700k',
      audioBitrate: '96k'
    },
    '480p': {
      resolution: { width: 854, height: 480 },
      videoBitrate: '1000k',
      audioBitrate: '128k'
    },
    '720p': {
      resolution: { width: 1280, height: 720 },
      videoBitrate: '2500k',
      audioBitrate: '192k'
    }
  }
};
