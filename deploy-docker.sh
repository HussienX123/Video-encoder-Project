#!/bin/bash

# Docker Deployment Script for Video Encoder Server
echo "🐳 Deploying Video Encoder Server with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    
    # Install Docker on Ubuntu/Debian
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed. Please log out and log back in, then run this script again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads output temp logs

# Set permissions
sudo chown -R $USER:$USER uploads output temp logs
chmod -R 755 uploads output temp logs

# Build and start the containers
echo "🔨 Building Docker image..."
docker-compose build

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "📊 Checking service status..."
docker-compose ps

# Test the application
echo "🧪 Testing application..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 Access your video encoder at: http://localhost"
    echo "📱 Direct application access: http://localhost:3000"
else
    echo "❌ Application health check failed. Checking logs..."
    docker-compose logs video-encoder
fi

echo ""
echo "🛠️  Useful Docker commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update and restart: docker-compose down && docker-compose up -d --build"
echo ""
echo "📋 Container status:"
docker-compose ps
