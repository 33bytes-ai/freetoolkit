# Deployment Guide

## Local development

```bash
# First time
make .venv          # create virtualenv and install deps

# Every time
make build          # regenerate dist/
make serve          # serve at http://localhost:8080
make test           # run all 837 tests
```

---

## VPS deployment (recommended — $5–10/month)

### Prerequisites
- VPS running Ubuntu 22/24 or Debian 12
- Docker and Docker Compose installed (`curl -fsSL https://get.docker.com | sh`)
- Domain pointing to the VPS IP via an A record

### First deploy

```bash
# From your local machine
FREETOOLKIT_HOST=root@your.vps.ip ./scripts/deploy.sh
```

This:
1. Syncs the project to `/srv/freetoolkit/` via rsync
2. Runs `docker compose build` (builds the static site inside Docker)
3. Starts `web` (nginx) and `analytics` (GoAccess) containers

### TLS / HTTPS

Install Certbot on the VPS and issue a Let's Encrypt certificate:

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot modifies the nginx config inside the container automatically. To keep
TLS working across container rebuilds, mount the Certbot certs as a volume
or install Certbot on the host with the host's nginx and reverse-proxy to the
Docker container on port 80.

The simplest production pattern is:
- Host nginx handles TLS termination and reverse-proxies to Docker on port 80
- Or use Caddy on the host (handles TLS automatically) and proxy to Docker

### Updating the site

```bash
# After changing content, tools, or templates locally:
FREETOOLKIT_HOST=root@your.vps.ip ./scripts/deploy.sh
```

The deploy takes ~30 seconds. The old containers keep serving traffic while
the new image builds.

---

## Free static hosting (Cloudflare Pages / Netlify)

Both Cloudflare Pages and Netlify host static sites for free with custom
domains and automatic HTTPS.

### Cloudflare Pages

1. Push the repo to GitHub.
2. Go to Cloudflare Dashboard → Workers & Pages → Create application → Pages.
3. Connect GitHub repo.
4. Build settings:
   - Build command: `pip install -e . && python src/freetoolkit/build.py`
   - Output directory: `dist`
5. Add custom domain under the project's Custom domains tab.

### Netlify

1. Push the repo to GitHub.
2. Go to netlify.com → Add new site → Import from Git.
3. Build settings:
   - Build command: `pip install -e . && python src/freetoolkit/build.py`
   - Publish directory: `dist`
4. Set custom domain under Domain settings.

---

## Analytics

GoAccess runs as a sidecar container and generates a real-time HTML report
from nginx access logs at `http://127.0.0.1:7890` (accessible only on the VPS).

To view the report remotely, create an SSH tunnel:

```bash
ssh -L 7890:127.0.0.1:7890 root@your.vps.ip
# Then open http://localhost:7890 in your browser
```

To regenerate a static (non-real-time) report from all log archives:

```bash
./scripts/analytics_report.sh
```

---

## Uptime monitoring

GoAccess only analyzes logs after the fact — it can't tell you nginx is down
right now. Two options are ready to go, and neither costs anything:

### Built-in: scheduled GitHub Actions check (zero signup, on by default)

`.github/workflows/uptime.yml` pings `content/config.yaml`'s `base_url`
every 15 minutes via `scripts/uptime_check.sh`. It self-activates: while
`base_url` is still the `example.com` placeholder it's a no-op, and the
moment step A1 in `HUMAN_INPUTS.md` updates `base_url` to the real domain,
the check starts running automatically — no extra step required.

A failed run shows as a red ✗ in the Actions tab, and GitHub emails
repo watchers on scheduled-workflow failures by default (Settings →
Notifications → Actions). For richer alerts (Slack/Discord message instead
of just an email), add a repo secret `UPTIME_WEBHOOK_URL` with an incoming
webhook URL — the workflow picks it up automatically.

Note: each GitHub Actions run starts with a clean `/tmp`, so
`scripts/uptime_check.sh`'s down/recovery de-duplication (see below) doesn't
carry over between runs — every 15-minute check while the site is down will
alert again. That's a reasonable tradeoff for a free, zero-maintenance
checker.

### Fallback: `scripts/uptime_check.sh` from cron

The same script can run from any external machine (your laptop, a spare
box, a free cron host like cron-job.org) — just not from the VPS itself,
since a check on the box that's down can't alert you:

```bash
UPTIME_URL=https://yourdomain.tld \
UPTIME_WEBHOOK_URL=https://hooks.slack.com/services/... \
./scripts/uptime_check.sh
```

Add it to a crontab for periodic checks (every 5 min shown; state is
persisted to `UPTIME_STATE_FILE` so it only alerts on down → up transitions,
not every run):

```
*/5 * * * * UPTIME_URL=https://yourdomain.tld UPTIME_WEBHOOK_URL=https://hooks.slack.com/services/... \
  /path/to/freetoolkit/scripts/uptime_check.sh >> /var/log/freetoolkit_uptime.log 2>&1
```

### Optional: third-party monitor (SMS/phone alerts, multi-region checks)

For alerting beyond email/Slack (e.g. SMS or phone calls) or checks from
multiple geographic regions, a free-tier third-party monitor is worth
adding once the domain is live — see `HUMAN_INPUTS.md` category A for the
signup steps ([UptimeRobot](https://uptimerobot.com) and
[Better Uptime](https://betteruptime.com) both have generous free tiers).

---

## Backup strategy

The site itself is reproducible from source, so only two things need backing up:

1. **nginx access logs** — automatically rotated weekly via logrotate on the VPS.
   The Docker volume `nginx_logs` is on the host filesystem, backed up by
   any VPS snapshot policy.
2. **GoAccess database** (`/reports/db`) — persists accumulated traffic data
   across log rotations. Included in VPS snapshots.

For $5/month Hetzner servers, automated weekly VPS snapshots cost ~$0.01/GB.
