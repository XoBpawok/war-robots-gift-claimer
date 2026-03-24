FROM node:20-slim

# Install Chromium + cron + dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    cron \
    bash \
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
RUN printf '%s\n' \
    "SHELL=/bin/bash" \
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    "0 8  * * * sleep \$((RANDOM \% 7200)) && PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node /app/src/claimer.js 2>&1" \
    "0 14 * * * sleep \$((RANDOM \% 7200)) && PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node /app/src/claimer.js 2>&1" \
    "0 20 * * * sleep \$((RANDOM \% 7200)) && PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node /app/src/claimer.js 2>&1" \
    | crontab -

# Entrypoint: start cron and tail logs to stdout
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
