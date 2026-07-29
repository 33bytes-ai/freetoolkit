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

## Deployment (Cloudflare Pages — free)

Migrated 2026-07-29 from a Hetzner VPS. The VPS existed solely to run
GoAccess for zero-tracking analytics; Cloudflare Web Analytics gives the
same guarantee for free, so the server was no longer justified. See
`HUMAN_INPUTS.md` A2 and `docs/ARCHITECTURE.md` for the reasoning.

### First deploy / redeploy

```bash
make build   # regenerates dist/
CLOUDFLARE_API_TOKEN=<token> npx wrangler pages deploy dist --project-name=foundercalc
```

Custom domain (`foundercalc.dev`) is attached to the Pages project in the
Cloudflare dashboard (Workers & Pages → foundercalc → Custom domains) — DNS
is a CNAME to `foundercalc.pages.dev`, proxied, SSL handled automatically.

Continuous deployment from GitHub is also available (connect the repo under
the project's Settings → Build, same build command/output dir above) if
push-to-deploy is preferred over the manual `wrangler` command.

---

## Analytics

**Cloudflare Web Analytics** — cookie-free, no JS tracking script, no
server required. Enable it in the Cloudflare dashboard for this zone.
Retention is 30 days (vs. GoAccess's unlimited local history), and it
lacks custom events/funnels — a real but currently theoretical tradeoff
given the site has negligible traffic history to lose.

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

Nothing to back up. The site is fully reproducible from source (`make
build`), Cloudflare Pages keeps every deployment's history natively (instant
rollback from the dashboard), and analytics now live in Cloudflare Web
Analytics rather than a local database that could be lost.
