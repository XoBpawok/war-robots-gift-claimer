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

### Prerequisites

- Portainer running with access to a Docker host
- The repository cloned or uploaded to the host (or accessible via Git)

### Option A — Docker Compose stack (recommended)

1. In Portainer, go to **Stacks → Add stack**
2. Name it `war-robots-claimer`
3. Choose **Web editor** and paste the contents of `docker-compose.yml`:

```yaml
services:
  claimer:
    build: .
    restart: unless-stopped
    volumes:
      - ./accounts.json:/app/accounts.json:ro
      - ./logs:/app/logs
```

4. Under **Env variables**, add any overrides if needed (see [Environment variables](#environment-variables))
5. Click **Deploy the stack**

> The `accounts.json` file must exist on the host at the path relative to the stack directory before deploying.

### Option B — Build and deploy image manually

1. On the Docker host, build the image:

```bash
docker build -t war-robots-claimer .
```

2. In Portainer, go to **Containers → Add container**
3. Set the image to `war-robots-claimer`
4. Under **Volumes**, add two bind mounts:
   - `/path/to/accounts.json` → `/app/accounts.json` (read-only)
   - `/path/to/logs` → `/app/logs`
5. Set **Restart policy** to `Unless stopped`
6. Click **Deploy the container**

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
