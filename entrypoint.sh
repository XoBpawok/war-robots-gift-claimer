#!/bin/sh

echo "[entrypoint] Starting cron..."
cron

# Ensure log directory exists
mkdir -p /app/logs

# Tail all .log files and watch for new ones (e.g. daily rotated app logs)
tailed=""
while true; do
  for f in /app/logs/*.log; do
    [ -f "$f" ] || continue
    case "$tailed" in
      *"$f"*) ;;
      *) tail -F "$f" & tailed="$tailed $f" ;;
    esac
  done
  sleep 60
done
