# Use official Node.js runtime as base image
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies and FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Verify FFmpeg installation
RUN ffmpeg -version

# Create app directories
RUN mkdir -p uploads output temp logs

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Change ownership of app directory to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
