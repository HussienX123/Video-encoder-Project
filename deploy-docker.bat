@echo off
REM Docker Deployment Script for Video Encoder Server (Windows)
echo 🐳 Deploying Video Encoder Server with Docker...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop from https://docker.com/products/docker-desktop
    echo After installation, restart your computer and run this script again.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not available. Please ensure Docker Desktop includes Docker Compose.
    pause
    exit /b 1
)

REM Create necessary directories
echo 📁 Creating directories...
if not exist "uploads" mkdir uploads
if not exist "output" mkdir output
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs

REM Build and start the containers
echo 🔨 Building Docker image...
docker-compose build

echo 🚀 Starting containers...
docker-compose up -d

REM Wait for services to start
echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Check if services are running
echo 📊 Checking service status...
docker-compose ps

REM Test the application
echo 🧪 Testing application...
curl -f http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Application is running successfully!
    echo 🌐 Access your video encoder at: http://localhost
    echo 📱 Direct application access: http://localhost:3000
) else (
    echo ❌ Application health check failed. Checking logs...
    docker-compose logs video-encoder
)

echo.
echo 🛠️  Useful Docker commands:
echo    View logs: docker-compose logs -f
echo    Stop services: docker-compose down
echo    Restart services: docker-compose restart
echo    Update and restart: docker-compose down ^&^& docker-compose up -d --build
echo.
echo 📋 Container status:
docker-compose ps

pause
