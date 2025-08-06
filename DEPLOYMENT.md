# Cloud Server Deployment Guide

This guide will help you deploy the Video Encoder & Streaming Server on your cloud server.

## Quick Deployment (Ubuntu/Debian)

### Option 1: Automated Setup Script
```bash
# Copy all project files to your server, then run:
chmod +x setup-server.sh
./setup-server.sh
```

### Option 2: Manual Setup

#### 1. Install Node.js
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (LTS version)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 2. Install FFmpeg
```bash
sudo apt install -y ffmpeg

# Verify installation
ffmpeg -version
```

#### 3. Setup Application
```bash
# Create application directory
sudo mkdir -p /var/www/video-encoder
sudo chown $USER:$USER /var/www/video-encoder
cd /var/www/video-encoder

# Copy your project files here
# Then install dependencies
npm install

# Create storage directories
mkdir -p uploads output temp logs
```

#### 4. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup auto-start on server boot
sudo pm2 startup systemd
pm2 save
```

## Server Configuration

### Environment Variables
Create a `.env` file:
```bash
cp .env.example .env
nano .env
```

Update with your settings:
```env
NODE_ENV=production
PORT=3000
MAX_FILE_SIZE=524288000
VIDEO_QUALITY=480p
```

### Nginx Reverse Proxy (Recommended)

#### Install Nginx
```bash
sudo apt install -y nginx
```

#### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/video-encoder
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Increase upload size limit
    client_max_body_size 500M;
    client_body_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

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

    # Optional: Serve static files directly through Nginx for better performance
    location /videos/ {
        alias /var/www/video-encoder/output/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/video-encoder /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Firewall Configuration
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## Performance Optimization

### Server Resources
- **Minimum**: 2 CPU cores, 4GB RAM, 50GB storage
- **Recommended**: 4+ CPU cores, 8GB+ RAM, 100GB+ SSD storage

### FFmpeg Optimization
For better performance, you can install FFmpeg with hardware acceleration:

```bash
# For Intel hardware acceleration
sudo apt install intel-media-va-driver-non-free

# For NVIDIA hardware acceleration (if you have NVIDIA GPU)
# Follow NVIDIA CUDA installation guide for your server
```

### Node.js Optimization
```bash
# Set Node.js memory limit for large video processing
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Monitoring and Maintenance

### PM2 Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs video-encoder-server

# Restart application
pm2 restart video-encoder-server

# Monitor resources
pm2 monit

# View detailed process info
pm2 show video-encoder-server
```

### Log Management
```bash
# Rotate PM2 logs
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### System Monitoring
```bash
# Install htop for system monitoring
sudo apt install htop

# Monitor disk usage
df -h

# Monitor video conversion processes
ps aux | grep ffmpeg
```

### Backup Strategy
```bash
# Create backup script
nano backup-videos.sh
```

Add this content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/video-encoder-$DATE"
mkdir -p $BACKUP_DIR

# Backup converted videos
cp -r /var/www/video-encoder/output/* $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

## Troubleshooting

### Common Issues

#### 1. FFmpeg not found
```bash
# Check if FFmpeg is in PATH
which ffmpeg
ffmpeg -version

# If not found, reinstall
sudo apt install --reinstall ffmpeg
```

#### 2. Permission issues
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/video-encoder

# Fix permissions
chmod -R 755 /var/www/video-encoder
```

#### 3. Large file upload issues
- Check Nginx configuration for `client_max_body_size`
- Verify disk space: `df -h`
- Check application logs: `pm2 logs`

#### 4. High CPU usage
- Monitor with: `htop`
- Limit concurrent conversions in the application
- Consider upgrading server resources

### Performance Tuning

#### 1. Concurrent Processing
Modify `server.js` to limit concurrent video conversions:
```javascript
// Add this at the top of server.js
const MAX_CONCURRENT_JOBS = 2; // Adjust based on your server CPU
let activeJobs = 0;
```

#### 2. Cleanup Old Files
Add automatic cleanup to save disk space:
```bash
# Add to crontab
crontab -e

# Clean files older than 24 hours every hour
0 * * * * find /var/www/video-encoder/output -name "*.mp4" -mtime +1 -delete
0 * * * * find /var/www/video-encoder/temp -name "*" -mtime +1 -delete
```

## Security Considerations

### 1. Basic Security
```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Use SSH keys instead of passwords
# Generate key on your local machine:
# ssh-keygen -t rsa -b 4096
# Copy to server: ssh-copy-id user@server-ip
```

### 2. Application Security
- Change default ports
- Add authentication (implement in the application)
- Use environment variables for secrets
- Regular security updates: `sudo apt update && sudo apt upgrade`

### 3. Fail2ban (Protection against brute force)
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Testing Your Deployment

### 1. Basic Test
```bash
# Test if server is running
curl http://your-server-ip:3000/health

# Test with Nginx
curl http://your-server-ip/health
```

### 2. Video Conversion Test
1. Open your browser: `http://your-server-ip`
2. Upload a small test video
3. Check if conversion works and video streams properly

### 3. Load Test (Optional)
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Simple load test
ab -n 100 -c 10 http://your-server-ip/
```

## Scaling Considerations

For high-traffic scenarios:
1. **Load Balancer**: Use multiple server instances
2. **CDN**: Serve converted videos through a CDN
3. **Queue System**: Implement Redis/RabbitMQ for job queuing
4. **Database**: Store job status and metadata in PostgreSQL/MongoDB
5. **Object Storage**: Store videos in AWS S3/Google Cloud Storage

---

**Next Steps After Deployment:**
1. Test video conversion with different file formats
2. Monitor server performance and resource usage
3. Set up monitoring alerts
4. Plan backup and disaster recovery
5. Consider implementing user authentication
6. Set up domain name and SSL certificate
