FROM node:20-slim

# Install Chromium + cron + dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    cron \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Validate Chromium installed at the expected path
RUN chromium --version

# Tell Puppeteer to use system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install Node dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# Create logs directory
RUN mkdir -p /app/logs

# Add cron job: run every 6 hours
# PUPPETEER_EXECUTABLE_PATH is explicitly set in the cron line because
# cron runs in a minimal shell that does not inherit Docker ENV variables
RUN echo "0 */6 * * * PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node /app/src/claimer.js >> /app/logs/cron.log 2>&1" | crontab -

# Start cron in foreground
CMD ["cron", "-f"]
