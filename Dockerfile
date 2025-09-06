# Use Node.js Alpine base
FROM node:18-alpine

# Install dependencies needed for Chrome
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    bash \
    xvfb-run \
    curl \
    git

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of project files
COPY . .

# Set environment variable for Chrome path
ENV CHROME_BIN=/usr/bin/chromium-browser

# Command to run tests
CMD ["npx", "wdio", "run", "wdio.conf.ts"]
