# Monetization Guide

## Revenue model: Google AdSense

FreeToolKit earns revenue by displaying contextually relevant ads served by
Google AdSense. There is no subscription, no freemium gate, and no data sold.

### How it works

AdSense pays on a **RPM (revenue per thousand impressions)** model. You
earn money each time a visitor loads a page with ads displayed. Additionally,
you earn each time a visitor clicks an ad (CPC — cost per click), though
most revenue at low scale comes from impressions.

**Typical RPM ranges (varies widely by niche and geography):**
- Developer tools (JSON formatter, Base64, password generator): $3–8 RPM
- General utilities (unit converter, word counter): $1.5–4 RPM
- Blended estimate for this site at steady state: ~$3–5 RPM

**Conservative revenue model at 1,000 daily visitors:**

| Metric | Value |
|--------|-------|
| Monthly pageviews | ~50,000 (avg 1.5 pages/visit) |
| Blended RPM | $3.50 |
| Monthly revenue | **~$175** |
| Operating cost (VPS) | $5–10 |
| Net monthly | **~$165–170** |

At 10,000 daily visitors the same model projects ~$1,650/month net.

### Enabling AdSense (after approval)

1. Register at https://adsense.google.com
2. Add the AdSense verification snippet to `templates/base.html` while awaiting
   review (see `HUMAN_INPUTS.md` for details)
3. Once approved, update `content/config.yaml`:
   ```yaml
   site:
     ads_enabled: true
     adsense_client_id: "ca-pub-XXXXXXXXXXXXXXXX"
   ```
   Or export at build time: `ADSENSE_CLIENT_ID=ca-pub-XXXX make build`
4. Rebuild and redeploy. Ad slots marked with `class="ad-slot"` in the
   generated HTML will start rendering ads.
5. Add `ads.txt` to your domain root to prevent ad fraud:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   Generate it at: https://support.google.com/adsense/answer/7532444

### Ad placement strategy

Current placements in `templates/`:
- One ad slot between the tool widget and the long-form content (`tool.html`)
- One ad slot on the home page between the hero and the tool grid (`index.html`)

These placements are chosen to maximize visibility without obstructing the
tool itself. AdSense auto ads can also be enabled from the AdSense dashboard
to let Google find additional placements automatically.

### Future monetization options

Once traffic is established, these can be layered in:

- **Affiliate links** — add relevant affiliate links within tool content pages
  (e.g. a link to a password manager on the password generator page).
  Amazon Associates, ShareASale, and Awin are free to join.
- **Sponsored content** — paid "How to" articles from tool-adjacent businesses.
  At 5,000+ daily visitors this becomes feasible.
- **Direct ad sales** — higher RPM than AdSense; relevant once there's
  an established audience in a niche (e.g. a developer-focused newsletter).

## KPIs to track monthly

| Metric | Where to find it |
|--------|-----------------|
| Organic impressions | Google Search Console |
| Organic clicks / CTR | Google Search Console |
| Sessions | GoAccess report |
| Top tool pages | GoAccess report |
| Ad impressions | AdSense dashboard |
| Estimated revenue | AdSense dashboard |
| RPM | AdSense dashboard → Reports |
