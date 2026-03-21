#!/bin/sh

echo "[entrypoint] Running claimer on startup..."
node /app/src/claimer.js

echo "[entrypoint] Starting cron..."
cron

# Tail log file to stdout so docker logs captures cron output
tail -f /app/logs/cron.log
