# 90-Day Growth Plan

## Strategic position after pivot

**Before:** Generic tools site competing for "json formatter online" against decade-old,
high-DA domains with millions of backlinks — unwinnable SEO war.

**After:** Niche business calculator site targeting specific high-intent queries like
"stripe fee calculator", "startup runway calculator", "ltv cac ratio" — all have
real monthly search volume and **orders of magnitude less competition**.

This changes the SEO math entirely. A new domain targeting "stripe fee calculator"
(~12k/month, DA 0–30 competition) can rank page 1 in 3–6 months. A new domain
targeting "json formatter" (500k/month, dominated by DA 50–80 incumbents) cannot.

---

## Phase 1 — Week 1–2: Go live (foundation)

- [ ] Register domain — prefer `foundercalc.com`, `foundercalc.io`, or similar
      (see `HUMAN_INPUTS.md` for registrar options)
- [ ] Update `base_url` in `content/config.yaml` to real domain, rebuild, deploy
- [ ] Update placeholder email in `content/pages/contact.md`
- [ ] Verify all 105 calculator pages load and compute correctly
- [ ] Submit sitemap to Google Search Console + Bing Webmaster Tools
- [ ] Apply for Google AdSense

**Why the niche RPM is higher:** Business/SaaS-tool audience. Stripe, SaaS, and
freelance keywords have CPC of $2–8 (advertisers compete for these eyeballs).
Expected blended RPM: **$8–20** (vs $1–3 for general utilities).

---

## Phase 2 — Week 3–4: Seeded distribution

**Post to communities — genuine contributions, not spam:**

- **Indie Hackers** (indiehackers.com): Post "I got tired of Googling Stripe fees
  every time I sent an invoice, so I built a free calculator". Link: `/tools/stripe-fee-calculator/`.
  Indie Hackers drives real founder traffic, exactly the target audience.

- **r/SaaS** (reddit.com/r/SaaS): Share the LTV/CAC and runway calculators with a
  post explaining the formulas and why they matter.

- **r/freelance**: Share the freelance rate calculator with explanation of the
  non-billable time and tax math.

- **Hacker News "Show HN"**: For the full suite — post includes formulas and
  a clear statement that everything runs in the browser.

- **Twitter/X**: 5–10 tweets, one per calculator, explaining the formula visually
  and linking to the tool. Pin the most popular one.

**Expected outcome:** 50–200 direct visits from community posts, first backlinks,
early indexing of multiple tool pages.

---

## Phase 3 — Month 2: SEO traction and expansion

**Track early performance in Search Console:**
- Find which tool page has the most impressions
- Focus on improving CTR for that page (often title/description optimization)

**Expand the tool set (2 new calculators):**
- PayPal fee calculator (similar search volume to Stripe)
- Rule of 40 calculator (SaaS founder vocabulary, very low competition)

**Write 2–3 intent-matched content pages:**
- "Stripe fees in the UK (2026) — complete breakdown with calculator"
- "What's a healthy LTV:CAC ratio for SaaS? (with benchmark data)"
- "How to calculate your freelance rate (the math most guides skip)"

Each page provides genuine information + natural link to the relevant calculator.
These rank for long-tail queries that collectively drive as much traffic as
the calculator pages themselves.

**Expected outcome:** 100–500 daily sessions, AdSense approval likely (content
threshold reached), first ad revenue.

---

## Phase 4 — Month 3: Scale the niche + monetize

**Enable AdSense** (post-approval):
- Set `ads_enabled: true` in `content/config.yaml`
- Add `ADSENSE_CLIENT_ID` at build time
- Redeploy

**Add programmatic long-tail pages:**
- "Stripe fees for [country]" — UK, Canada, Australia, EU — 10–20 pages,
  each pre-filled with local context, very low per-page competition
- Generated via a content loop in `build.py` (expand `templates/` with a
  `countries.yaml` file and a new `country-stripe.html` template)

**Monitor RPM vs traffic:**
- Business calculators should hit $8–15 RPM
- If RPM is below $5, move the ad slot above the calculator widget
- If RPM is above $15, test a second ad slot at page bottom

**Expected outcome:** 500–1,500 daily sessions, $75–400/month net revenue.

---

## Traffic and revenue projections (revised for niche)

| Timeline | Daily visitors | Monthly RPM | Monthly revenue |
|----------|---------------|------------|----------------|
| Day 30   | 30–80         | Pre-approval | —             |
| Day 60   | 150–400       | $10–15     | $50–200        |
| Day 90   | 400–1,200     | $10–20     | $120–720       |
| Month 6  | 1,500–5,000   | $12–20     | $540–3,000     |
| Month 12 | 5,000–20,000  | $12–20     | $1,800–12,000  |

The higher RPM ceiling (vs generic tools) is the key insight: the same number
of visitors generates 5–8× more ad revenue in this niche.

---

## Competitive moat (why this works long-term)

1. **Topical authority** — all calculators are in the same domain (founder/SaaS
   tools), which signals to Google this site is an authoritative source on the topic.

2. **Community distribution** — founder communities share useful tools organically.
   Once you have 3–4 calculators that indie hackers bookmark, the rest benefit from
   the same referral traffic.

3. **High-intent visitors** — people calculating LTV or Stripe fees are actively
   running businesses. Advertisers pay more to reach them. This is a durable
   advantage over a general utility audience.

4. **Formula accuracy + explanations** — the long-form content on each page builds
   genuine E-E-A-T signals and differentiates from bare calculation tools.
