# Docker Deployment Guide

This guide explains how to deploy the Video Encoder Server using Docker for easy, consistent deployment across different environments.

## Quick Start

### Option 1: Automated Deployment
```bash
chmod +x deploy-docker.sh
./deploy-docker.sh
```

### Option 2: Manual Docker Deployment

#### 1. Install Docker (if not already installed)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Log out and log back in after installation
```

#### 2. Build and Run with Docker Compose
```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Docker Configuration

### Dockerfile Features
- **Base Image**: Node.js 18 on Debian Bullseye (slim)
- **FFmpeg**: Pre-installed and ready for video processing
- **Security**: Non-root user execution
- **Health Check**: Built-in health monitoring
- **Optimized**: Multi-stage build for smaller image size

### Docker Compose Services

#### 1. Video Encoder Service
- **Port**: 3000
- **Volumes**: Persistent storage for videos and logs
- **Resources**: CPU and memory limits
- **Health Check**: Automatic service monitoring

#### 2. Nginx Reverse Proxy (Optional)
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Features**: Load balancing, static file serving, SSL termination
- **Performance**: Direct video serving, compression

## Deployment Commands

### Basic Operations
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f video-encoder

# Check service status
docker-compose ps
```

### Building and Updating
```bash
# Build from scratch
docker-compose build --no-cache

# Update and restart
docker-compose down && docker-compose up -d --build

# Pull latest base images
docker-compose pull
```

### Maintenance
```bash
# Clean up unused Docker resources
docker system prune -a

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# View disk usage
docker system df
```

## Environment Configuration

### Environment Variables
Create a `.env` file for production:
```env
NODE_ENV=production
PORT=3000
MAX_FILE_SIZE=524288000
VIDEO_QUALITY=480p
```

### Volume Configuration
The Docker setup uses these persistent volumes:
- `./output:/app/output` - Converted video files
- `./uploads:/app/uploads` - Temporary uploaded files
- `./logs:/app/logs` - Application logs

## Resource Management

### CPU and Memory Limits
Adjust in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'        # Adjust based on your server
      memory: 8G         # Increase for larger videos
    reservations:
      cpus: '1.0'
      memory: 2G
```

### Storage Considerations
- **Minimum**: 50GB for moderate usage
- **Recommended**: 200GB+ for heavy usage
- **Cleanup**: Implement automatic cleanup for old videos

## Production Deployment

### 1. Cloud Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to Docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Deploy Application
```bash
# Clone/upload your project files
cd /path/to/video-encoder-project

# Deploy with the script
chmod +x deploy-docker.sh
./deploy-docker.sh
```

### 3. Configure Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## SSL/HTTPS Setup

### 1. Using Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt install certbot

# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Update docker-compose.yml to mount certificates
# Add to nginx service volumes:
# - /etc/letsencrypt:/etc/letsencrypt:ro
```

### 2. Update Nginx Configuration
Uncomment and configure the SSL server block in `nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # ... rest of configuration
}
```

## Monitoring and Logging

### Health Checks
```bash
# Check container health
docker ps

# Application health endpoint
curl http://localhost/health

# Detailed health information
docker inspect video-encoder-server | grep Health -A 10
```

### Log Management
```bash
# View application logs
docker-compose logs -f video-encoder

# View Nginx logs
docker-compose logs -f nginx

# Log rotation (add to crontab)
0 0 * * * docker-compose exec video-encoder sh -c "find /app/logs -name '*.log' -mtime +7 -delete"
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Network information
docker network ls
```

## Scaling and Performance

### Horizontal Scaling
For high-traffic scenarios, use multiple instances:
```yaml
video-encoder:
  # ... other configuration
  deploy:
    replicas: 3  # Run 3 instances
```

### Load Balancing
Configure Nginx for load balancing across multiple instances:
```nginx
upstream video_encoder {
    server video-encoder_1:3000;
    server video-encoder_2:3000;
    server video-encoder_3:3000;
}
```

### Performance Optimization
1. **SSD Storage**: Use SSD for better I/O performance
2. **CPU**: More cores = faster video processing
3. **RAM**: 8GB+ recommended for concurrent processing
4. **Network**: High bandwidth for large video uploads

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker-compose logs video-encoder

# Check Docker daemon
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

#### 2. Permission Issues
```bash
# Fix volume permissions
sudo chown -R $USER:$USER output uploads logs

# Check container user
docker-compose exec video-encoder whoami
```

#### 3. FFmpeg Issues
```bash
# Test FFmpeg in container
docker-compose exec video-encoder ffmpeg -version

# Check FFmpeg capabilities
docker-compose exec video-encoder ffmpeg -encoders
```

#### 4. Network Issues
```bash
# Check container networking
docker network ls
docker network inspect video-encoder-project_default

# Test connectivity
docker-compose exec video-encoder curl http://localhost:3000/health
```

### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check system resources
htop
df -h
```

## Backup and Recovery

### Backup Strategy
```bash
#!/bin/bash
# backup-videos.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/video-encoder-$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup converted videos
docker cp video-encoder-server:/app/output $BACKUP_DIR/

# Backup configuration
cp docker-compose.yml $BACKUP_DIR/
cp nginx.conf $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

### Recovery
```bash
# Restore from backup
tar -xzf backup-file.tar.gz
docker-compose down
cp -r backup-directory/output ./
docker-compose up -d
```

## Security Best Practices

1. **Regular Updates**
   ```bash
   # Update base images regularly
   docker-compose pull
   docker-compose up -d --build
   ```

2. **Non-root User**: Container runs as non-root user

3. **Network Security**: Use Docker networks for isolation

4. **Secrets Management**: Use Docker secrets for sensitive data

5. **Resource Limits**: Set appropriate CPU/memory limits

6. **Log Security**: Rotate and secure log files

---

## Quick Reference

### Essential Commands
```bash
# Deploy
./deploy-docker.sh

# Status
docker-compose ps

# Logs
docker-compose logs -f

# Stop
docker-compose down

# Update
docker-compose down && docker-compose up -d --build

# Health
curl http://localhost/health

# Monitor
docker stats
```

### Access Points
- **Application**: http://localhost:3000
- **With Nginx**: http://localhost
- **Health Check**: http://localhost/health
- **API**: http://localhost/api/*
