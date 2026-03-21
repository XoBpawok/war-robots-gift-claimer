# War Robots Gift Claimer

Automatically claims free gifts on [market.my.games] on a schedule. Runs as a Docker container with a cron job every 6 hours.

## Setup

### 1. Prepare accounts.json

Create `accounts.json` in the project root (use `accounts.json.example` as a template):

```json
[
  { "login": "user1@example.com", "password": "secret1" },
  { "login": "user2@example.com", "password": "secret2" }
]
```

> **Note:** `accounts.json` is gitignored — never commit credentials.

---

## Deploy on Portainer

Every push to `master` automatically builds and publishes the Docker image to GHCR via GitHub Actions. Portainer pulls that image directly — no source code needed on the host.

### 1. Prepare accounts.json on the host

SSH into the Docker host and create the accounts file:

```bash
mkdir -p /opt/war-robots/logs
nano /opt/war-robots/accounts.json
```

Paste your credentials:

```json
[
  { "login": "user1@example.com", "password": "secret1" }
]
```

### 2. Create the stack in Portainer

1. Go to **Stacks → Add stack**
2. Name it `war-robots-claimer`
3. Choose **Web editor** and paste:

```yaml
services:
  claimer:
    image: ghcr.io/xobpawok/war-robots-gift-claimer:latest
    restart: unless-stopped
    volumes:
      - /opt/war-robots/accounts.json:/app/accounts.json:ro
      - /opt/war-robots/logs:/app/logs
```

4. Click **Deploy the stack**

Docker will pull the image from GHCR and start the container. Done.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` (set in image) | Path to Chromium binary |
| `PUPPETEER_HEADLESS` | `true` | Set to `false` to run with a visible browser (debug only) |

---

## Logs

The cron job appends output to `/app/logs/cron.log` inside the container. With the bind mount in place, logs are also available on the host at `./logs/cron.log`.

To tail logs live from Portainer: open the container → **Logs**.

To tail from the host:

```bash
docker logs -f <container-name>
# or
tail -f ./logs/cron.log
```

---

## Schedule

The cron job runs every 6 hours:

```
0 */6 * * *
```

To change the schedule, edit the `RUN echo "..."` line in the `Dockerfile` and rebuild the image.
