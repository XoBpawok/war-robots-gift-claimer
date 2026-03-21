#!/bin/sh
set -e

echo "[entrypoint] Running claimer on startup..." >> /app/logs/cron.log 2>&1
node /app/src/claimer.js >> /app/logs/cron.log 2>&1

echo "[entrypoint] Starting cron..." >> /app/logs/cron.log 2>&1
exec cron -f
