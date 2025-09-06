# Dockerfile for WebdriverIO automation 
FROM node:18-alpine

# Install Chrome dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chrome environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for WebdriverIO CLI)
RUN npm ci

# Copy source code
COPY . .

# Create directories for reports
RUN mkdir -p test-reports coverage allure-results

# Expose port for reports
EXPOSE 3000

# Default command - use npx to ensure wdio is found
CMD ["npx", "wdio", "run", "wdio.conf.js"]