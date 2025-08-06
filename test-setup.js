const express = require('express');
const ffmpeg = require('fluent-ffmpeg');

// Test script to verify all dependencies are working
console.log('🧪 Testing Video Encoder Setup...\n');

// Test 1: Express
try {
  const app = express();
  console.log('✅ Express.js - OK');
} catch (error) {
  console.log('❌ Express.js - ERROR:', error.message);
}

// Test 2: FFmpeg
try {
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      console.log('❌ FFmpeg - ERROR: FFmpeg not found or not properly installed');
      console.log('   Please install FFmpeg on your system:');
      console.log('   - Windows: Download from https://ffmpeg.org/download.html');
      console.log('   - Linux: sudo apt install ffmpeg');
      console.log('   - macOS: brew install ffmpeg');
    } else {
      console.log('✅ FFmpeg - OK');
      console.log('📋 Available video formats:', Object.keys(formats).slice(0, 10).join(', '), '...');
    }
  });
  
  // Test FFmpeg version
  ffmpeg.ffprobe('-version', (err, data) => {
    if (!err && data) {
      console.log('📊 FFmpeg version detected');
    }
  });
} catch (error) {
  console.log('❌ FFmpeg - ERROR:', error.message);
}

// Test 3: Other dependencies
const dependencies = [
  'multer',
  'cors',
  'helmet',
  'morgan',
  'uuid',
  'fs-extra'
];

dependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep} - OK`);
  } catch (error) {
    console.log(`❌ ${dep} - ERROR:`, error.message);
  }
});

console.log('\n🚀 Setup test completed!');
console.log('If all dependencies show OK, you can start the server with: npm start');
console.log('If FFmpeg shows ERROR, please install it on your system before running the server.');

setTimeout(() => {
  process.exit(0);
}, 2000);
