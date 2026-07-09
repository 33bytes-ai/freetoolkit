# Human Inputs Required

These are the one-time manual steps a human must perform before the site
generates revenue. They are few, free, and cannot be automated.

---

## Step 1 — Register a domain (~15 minutes, ~$10–15/year)

1. Pick a memorable `.com` domain (e.g. `freetoolhub.com`,
   `quickwebtools.com`, `toolhive.io`). Search availability on
   [Namecheap](https://namecheap.com) or [Cloudflare Registrar](https://cloudflare.com/registrar/).
2. Register it. Cloudflare Registrar sells at cost (no markup) and includes
   free WHOIS privacy.
3. Update `base_url` in `content/config.yaml` to your real domain.
4. Rebuild: `make build`.

---

## Step 2 — Set up a VPS or free static host (~20 minutes)

**Option A — VPS ($5–10/month):**
1. Create a VPS at Hetzner, Vultr, or DigitalOcean (cheapest tier, Ubuntu 24).
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Point your domain's A record to the VPS IP.
4. Run `FREETOOLKIT_HOST=root@your.vps.ip ./scripts/deploy.sh` from this
   directory to sync and start the containers.
5. Set up a free TLS certificate with Certbot:
   `certbot --nginx -d yourdomain.com -d www.yourdomain.com`

**Option B — Cloudflare Pages (free, zero maintenance):**
1. Push this repository to GitHub.
2. Connect the repo in Cloudflare Pages → choose branch `main`.
3. Set build command: `make build`, output directory: `dist`.
4. Add custom domain.
5. Done — Cloudflare handles TLS, CDN, and deploys on every git push.

---

## Step 3 — Apply for Google AdSense (~10 minutes to apply, 2–4 weeks review)

1. Go to https://adsense.google.com and sign in with a Google account.
2. Enter your website URL and your payment address (for tax purposes).
3. Paste the AdSense verification `<script>` tag into the `<head>` of your
   live site while awaiting review. The easiest way is to add it directly
   to `templates/base.html` temporarily, rebuild, and deploy.
4. Once approved (typically 2–4 weeks for new sites):
   - Copy your **Publisher ID** (format: `ca-pub-XXXXXXXXXXXXXXXX`)
   - Set `ads_enabled: true` in `content/config.yaml`
   - Set `adsense_client_id` in `content/config.yaml` or export
     `ADSENSE_CLIENT_ID=ca-pub-XXXXXX` at build time
   - Rebuild and redeploy

**AdSense approval tips:**
- The site needs unique, useful content — the 10 tool pages with their
  descriptions already meet this requirement.
- Make sure the privacy policy at `/privacy/` is live and linked from the footer.
- 15–20 real organic visitors per day helps the review; consider sharing
  the site in relevant online communities first.

---

## Step 4 — Update the CI badge in README.md

Replace `YOUR_USERNAME/freetoolkit` in the badge URL at the top of `README.md`
with your actual GitHub `username/repo` (e.g. `jsmith/freetoolkit`).

---

## Step 5 — Update the contact email

Replace the placeholder address in `content/pages/contact.md` with a real
email address you own. This is also required for AdSense and adds
credibility.

---

## What runs automatically after that

Everything else is autonomous:
- The site is served by nginx with no backend process
- GoAccess parses access logs and generates a traffic report weekly
- `scripts/deploy.sh` handles future code + content updates in one command
- Log rotation via `logrotate` (standard on most Linux VPS images)
- TLS certificate renewal via Certbot's systemd timer (auto-renewed)
- New tools can be added with `scripts/new_tool.py` + one redeploy
