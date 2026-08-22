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

### AdSense status

**Rejected 7 August 2026** — *"Contenu à faible valeur informative"* (thin
content), with `ads.txt` additionally reported as *Introuvable*.

Both causes are addressed in the build (see "Content architecture" in
`CLAUDE.md`):

- ~320 intent/country pages averaging 244 words, plus a 9-term glossary
  averaging 165, were merged into the pages they support. The site went from
  462 URLs to ~134, and the median tool page from 303 words to ~1,300. Tests
  now fail if any tool page drops below 600 visible words, or if anything in
  `sitemap.xml` falls under 300.
- `ads_enabled: true` and `adsense_client_id` are set, so the ad snippet, the
  Funding Choices consent banner and `/ads.txt` all render. AdSense reviews
  the site **as served**, so these must be live on the deployed site before
  requesting a re-review — the `ads.txt` "not found" verdict was a stale
  deploy, not a build problem.

### Configuration

`content/config.yaml`:
```yaml
site:
  ads_enabled: true
  adsense_client_id: "ca-pub-XXXXXXXXXXXXXXXX"
```
Or export at build time: `ADSENSE_CLIENT_ID=ca-pub-XXXX make build`.

`build.py` writes `/ads.txt` from `adsense_client_id` on every build:
```
google.com, ca-pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

### Requesting a re-review

1. Deploy, then confirm on the live domain: `/ads.txt` returns the publisher
   line, a tool page contains `adsbygoogle.js`, and a retired guide URL 301s
   to its section anchor.
2. Give Google a few days to recrawl the consolidated structure — resubmitting
   before the old thin URLs drop out invites the same verdict.
3. Request the review from the Sites page in the AdSense dashboard.

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
