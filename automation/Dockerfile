# Dockerfile - Shows all automation in logs
FROM node:18-alpine

WORKDIR /app

# Copy all files
COPY . .

# Create directories
RUN mkdir -p build-reports test-reports logs

# Don't run scripts during build, run them at runtime
# This way they show in docker logs

EXPOSE 4444

# Run the automation runner which shows everything
CMD ["npm", "start"]