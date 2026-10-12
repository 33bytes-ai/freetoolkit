# AdSense — second refusal (2026-10-12)

Re-review requested 2026-10-03, refused 2026-10-12 05:09 CEST. Same motif as
August: *Contenu à faible valeur informative*. `ads.txt` now **Autorisé**,
ownership validated.

Google's wording asks for: substantial **unique** value, **ongoing curation and
maintenance**, **genuine user interest**. That is a uniqueness / traffic /
maturity verdict, not a word-count one.

## What was measured

- Live sitemap: 131 URLs (105 tools, 12 categories, legal + comparison pages).
- Sampled 1/3 of them: median ~1 225 words/page, shortest 367 (`/categories/hr-people/`).
- `content/tools.yaml` bodies: no pair shares more than 5 % of 5-word shingles —
  the text is not templated. Thin text is **not** the problem any more.
- No tool carries an `updated` date; every page shows only "Added <date>".
  Maintenance is invisible.

## Where the weakness is

Commodity calculators. ROA, markup, percentage change, COGS, current ratio:
thousands of identical pages exist, so "unique value" is hard to claim page by
page. Eight pairs overlap in intent and compete with each other:

| A | B |
|---|---|
| profit-margin-calculator | gross-profit-margin-calculator |
| gross-margin-calculator | gross-profit-margin-calculator |
| gross-margin-calculator | segment-margin-calculator |
| payback-period-calculator | cac-payback-calculator |
| operating-cash-flow-calculator | free-cash-flow-calculator |
| mrr-calculator | arr-mrr-converter |
| employee-cost-calculator | employee-turnover-cost-calculator |
| break-even-calculator | break-even-revenue-calculator |

Search Console, 90 days to 2026-10-09: **47 826 impressions, 44 clicks** (CTR 0.09 %)
over 346 pages. The eight pairs total ~0 clicks, so merging costs no traffic —
but it gains little either: only `gross-profit-margin` → `gross-margin` and
`break-even-revenue` → `break-even` are the same calculation; the other six
pairs compute different things (CAC vs plain payback, FCF vs operating cash
flow, MRR vs ARR conversion…). Merges would take 131 → 129 URLs: not worth a
redirect + test churn. Not done.

The real signal is the CTR: Google shows the site, nobody clicks. Top
impressions: price-per-unit (2 760), IRR (2 247), payback period (1 667), WACC
(1 573) — all 0 clicks. Titles/meta descriptions on those pages are the
cheapest lever for real visitors.

(`make gsc` URL inspection timed out twice on Google's side; this uses the
Performance API instead.)

## Plan, in order of expected effect

1. **Real visitors.** Nothing else moves "genuine user interest". One channel at
   a time (see `docs/GROWTH_PLAN.md`); drafts below. Human step: posting.
2. **Visible maintenance.** Done in this branch: tool pages show "Updated <date>"
   and `dateModified` follows `tool.updated`. Set `updated:` in `tools.yaml`
   only when a tool's content or logic really changes — never to fake freshness.
3. **Distinctive core.** Keep the tools nobody else has (Stripe fee by country,
   NPV/discount-rate, SaaS metrics); decide the 8 overlapping pairs above from
   `make gsc` impressions, then merge the weaker of each pair behind a 301.
4. **Do not ask for a third review** before 1–3 show up in Cloudflare Web
   Analytics. A third identical verdict gains nothing.
5. **Fallback revenue.** Ad networks with lower bars exist (Media.net,
   Ezoic, Carbon Ads for developer audiences); each has its own traffic
   minimum and terms — verify before applying. Affiliates (Baremetrics) keep
   working without AdSense.

## Draft posts (not published — human posts, one channel at a time)

**Reddit r/SaaS or r/startups (flair-compliant, no link in title):**
> I built free calculators for the numbers founders keep redoing in
> spreadsheets: Stripe fees by country, SaaS payback, runway, NPV. No signup,
> everything computed in your browser. What calculation do you wish existed?

**Indie Hackers:** same body, add one real number from a tool (recompute it
with the tool's own JS first, as `docs/SOCIAL.md` requires).
