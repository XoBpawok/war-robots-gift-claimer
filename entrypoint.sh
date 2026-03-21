#!/bin/sh

echo "[entrypoint] Starting cron..."
cron

# Ensure log file exists (volume mounts may override the file created during build)
mkdir -p /app/logs && touch /app/logs/cron.log

# Tail log file to stdout so docker logs captures cron output
tail -f /app/logs/cron.log
