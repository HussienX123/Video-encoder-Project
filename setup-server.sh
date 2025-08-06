#!/bin/bash

# Video Encoder Server Setup Script
# This script sets up the video encoder server on a fresh Ubuntu/Debian server

echo "🚀 Setting up Video Encoder Server..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
echo "📥 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
echo "🎬 Installing FFmpeg..."
sudo apt install -y ffmpeg

# Install PM2 globally
echo "⚙️ Installing PM2 process manager..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/video-encoder
sudo chown $USER:$USER /var/www/video-encoder

# Navigate to application directory
cd /var/www/video-encoder

# If project files are not already here, you would clone/copy them
# For now, assume files are already copied

# Install dependencies
echo "📚 Installing Node.js dependencies..."
npm install

# Create necessary directories
echo "📂 Creating storage directories..."
mkdir -p uploads output temp logs

# Set permissions
sudo chown -R $USER:$USER /var/www/video-encoder
chmod -R 755 /var/www/video-encoder

# Configure environment
echo "🔧 Setting up environment..."
cp .env.example .env

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
sudo pm2 startup systemd
pm2 save

# Install and configure Nginx (optional)
read -p "Do you want to install and configure Nginx as reverse proxy? (y/n): " install_nginx

if [ "$install_nginx" = "y" ]; then
    echo "🌐 Installing and configuring Nginx..."
    sudo apt install -y nginx
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/video-encoder << EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/video-encoder /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Restart Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo "✅ Nginx configured successfully!"
fi

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
echo "y" | sudo ufw enable

# Display status
echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📊 Service Status:"
pm2 status
echo ""
echo "🌐 Server Information:"
echo "   Application URL: http://$(curl -s ifconfig.me)"
echo "   Application Directory: /var/www/video-encoder"
echo "   PM2 Status: pm2 status"
echo "   View Logs: pm2 logs video-encoder-server"
echo ""
echo "🔧 Useful Commands:"
echo "   Restart App: pm2 restart video-encoder-server"
echo "   Stop App: pm2 stop video-encoder-server"
echo "   View Logs: pm2 logs video-encoder-server"
echo "   Monitor: pm2 monit"
echo ""
echo "📋 Next Steps:"
echo "   1. Configure your domain name (if using)"
echo "   2. Set up SSL certificate (recommended: certbot)"
echo "   3. Update .env file with production settings"
echo "   4. Test video conversion functionality"
echo ""
