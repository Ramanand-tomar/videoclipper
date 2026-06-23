# Use a stable Debian-based Node.js image to ensure compatibility with native modules (like tensorflow)
FROM node:20-bullseye-slim

# Install system dependencies: python3, ffmpeg, and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install the latest yt-dlp executable directly to /usr/local/bin
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set app directory
WORKDIR /app

# Copy packages
COPY package*.json ./

# Install npm packages (ignoring postinstall script initially to avoid missing scripts errors)
RUN npm ci --ignore-scripts

# Copy the rest of the project files
COPY . .

# Run the postinstall script manually now that the source files and scripts/ directory are present
RUN npm run postinstall

# Build Next.js in production mode
RUN npm run build

# Expose Next.js server port
EXPOSE 3000

# Set environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Start Next.js server
CMD ["npm", "run", "start"]
