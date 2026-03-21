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

The app ships as a Docker image built from source. Portainer needs access to the source code to build it. There are two ways to provide that.

---

### Option A — Git repository stack (recommended)

Portainer can clone the repo and build the image automatically — no SSH needed.

1. In Portainer, go to **Stacks → Add stack**
2. Name it `war-robots-claimer`
3. Choose **Repository** as the build method
4. Set **Repository URL** to `https://github.com/XoBpawok/war-robots-gift-claimer`
5. Set **Compose path** to `docker-compose.yml`
6. Under **Advanced settings → Env variables**, add any overrides if needed (see [Environment variables](#environment-variables))
7. Click **Deploy the stack**

Portainer will clone the repo into a directory on the host and run `docker compose up --build` from there.

**Before deploying**, SSH into the host and create `accounts.json` inside the directory Portainer uses for the stack (shown in the stack details after deployment). Then redeploy or restart the container.

> Alternatively: SSH in first, create the file at a known absolute path, and update the volume path in `docker-compose.yml` to an absolute path (e.g. `/opt/war-robots/accounts.json`).

---

### Option B — Clone manually, deploy with Web editor

If you prefer full control over where the source lives:

1. SSH into the Docker host and clone the repo:

```bash
git clone https://github.com/XoBpawok/war-robots-gift-claimer.git /opt/war-robots
cd /opt/war-robots
cp accounts.json.example accounts.json
# edit accounts.json with real credentials
```

2. In Portainer, go to **Stacks → Add stack**
3. Choose **Web editor**, paste the contents of `docker-compose.yml`
4. Set **Working directory** (under Advanced) to `/opt/war-robots`
5. Click **Deploy the stack**

Portainer will run `docker compose up --build` from `/opt/war-robots`, where both the `Dockerfile` and `accounts.json` already exist.

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
