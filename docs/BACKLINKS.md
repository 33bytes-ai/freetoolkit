# Backlink pack

Authority is the bottleneck: Search Console shows 47.8k impressions and 44
clicks over 90 days at an average position of 50 (checked 2026-10), and AdSense
has refused twice for low user interest. Nothing in this pack changes the code.
It is a sequence of human steps, in order, each with the exact URL, the text to
paste and the sign that it worked.

Nothing here has been submitted, posted or emailed. Written 2026-10-12.

## Read this first

- **Verification level.** Each target was checked on 2026-10-12 by a live fetch
  or search. Pricing and review times change often, and several sites sit behind
  a bot wall that blocks scripted fetches (marked `bot wall` below: the site is
  live, but its rules came from search results, not from its own page). Where a
  term is unconfirmed the table says so. **The form you see wins over this
  document**: if it asks for money you did not plan on, stop and skip it.
- **Link type is not promised.** Many of these links are `nofollow` or become
  followed only after a step (SaaSHub: verify the listing). After each
  listing goes live, check the real `<a>` with
  `curl -fsSL <listing-url> | grep -i foundercalc` and record its `rel`.
- **Mind the badge trade.** Fazier's free plan and Twelve Tools' free plan
  require a link back to them on your homepage or footer. That is a reciprocal
  link, which is what this pack tries to avoid. Both are marked `reciprocal`
  and sit at the end of the order. Do not accept them unless Guillaume decides
  a footer badge is acceptable.
- **Why a launch post beats a listing.** A directory listing is a link nobody
  reads. A post that gets 20 genuine comments produces links from people who
  write blogs. The pack therefore puts two community posts ahead of most
  directories.

## Facts used in every text (from `content/`)

| Fact | Value | Source |
|---|---|---|
| Name, domain | FounderCalc, https://foundercalc.dev | `content/config.yaml` |
| Calculators | 105 entries in `tools.yaml`, 104 distinct (`gross-profit-margin-calculator` is a canonical alias of `gross-margin-calculator`) | `content/tools.yaml` |
| Categories | 12 (Payments, SaaS Growth Metrics, SaaS Retention Metrics, Freelance, Pricing & Margins, Marketing, Finance, Cash Flow, Investment & Returns, Valuation, Tax & Compliance, HR & People) | `content/config.yaml` |
| Largest categories | Pricing & Margins 16, SaaS Growth Metrics 15, SaaS Retention Metrics 14, Finance 14 | `tools.yaml` |
| Cost, sign-up | Free, no sign-up, runs in the browser, nothing sent to a server | `site.description` |
| Languages | English indexed; fr/es/de applied in the browser | `CLAUDE.md` |
| Embeds | `/embed/<slug>/` for every tool, free with a credit link | `CLAUDE.md`, `templates/tool.html` |
| Pro | EUR 12/month, no credit line, `?accent=<hex>` | `config.yaml` `site.pro` |
| Publisher | Guillaume Malvestio, sole trader, France | `config.yaml` `site.legal` |
| Tested | Each tool's JS has Node tests (`tests/test_tools.js`) | repo |

Never write a number that is not in this table or recomputed (see the posts).
Do not claim users, revenue, "trusted by" or reviews: there are none to cite.

### The one recomputed number

Recomputed on 2026-10-12 by running the tool's own functions
(`static/js/tools/stripe-fee-calculator.js`) in Node, standard US card
2.9% + $0.30:

```bash
node -e 'const s=require("./static/js/tools/stripe-fee-calculator.js");
for (const a of [5,9,29,100]) { const r=s.calculateFee(a,0.029,0.30);
console.log(a, r.fee.toFixed(4), (r.fee/a*100).toFixed(2)+"%", r.net.toFixed(2)) }
console.log(s.calculatePassthrough(9,0.029,0.30).chargeAmount.toFixed(4))'
```

| Charge | Fee | Share of the charge | You keep |
|---|---|---|---|
| $5 | $0.445 | 8.90% | $4.55 |
| $9 | $0.561 | 6.23% | $8.44 |
| $29 | $1.141 | 3.93% | $27.86 |
| $100 | $3.20 | 3.20% | $96.80 |

To net exactly $9.00 you must charge $9.58. Stripe rounds the fee to the cent in
real life; the calculator shows the unrounded figure. Say "about" in posts.
The headline: **the same card fee takes 6.2% of a $9 subscription and 3.2% of
a $100 invoice**, because the fixed $0.30 does not scale.

Re-run the command before posting if `stripe-fee-calculator.js` has changed.

## Part 1. Ranked targets

Ranked by value for this site (fit, link value, effort, risk). "Reviewed" is
what the target says or what search reported on 2026-10-12.

| # | Target | Submit at | Cost | Fields (what it asks) | Review time | Link / value | Status of this check |
|---|---|---|---|---|---|---|---|
| 1 | **Indie Hackers** | https://www.indiehackers.com (sign in, then **New Post** and **Products**) | Free | Post: title, body, group. Product page: name, URL, tagline, description, logo | None for posts; product page is instant | Profile/product link plus real founder referral traffic | `bot wall`; live, post rules not quoted anywhere official, so follow the community norms in the draft |
| 2 | **SaaSHub** | https://www.saashub.com/services/submit | Free; featured listing is $99/month (skip) | Product URL, categories, competitors; then verify ownership by an email on your domain or an HTML meta tag | Manual approval, no stated time | Verifying the listing is what makes the website link followed, per a SaaSCity test (secondary source) | `bot wall`; terms from search |
| 3 | **Hacker News Show HN** | https://news.ycombinator.com/submit | Free | Title (must start with `Show HN:`), URL | None | Link is `nofollow`; value is traffic and the crawl | Rules fetched from https://news.ycombinator.com/showhn.html |
| 4 | **Product Hunt** | https://www.producthunt.com then **Submit**, **New Product** | Free | Product URL first, then name, tagline, description, topics, gallery images, first comment | Same day | High authority; link attribute unconfirmed | Live; free per its own guide |
| 5 | **AlternativeTo** | https://alternativeto.net (sign in, user icon, **Suggest new application**) | Free; a third-party review reports a $5 priority review, unconfirmed | Name, URL, description, platforms, license (Free), tags, "alternative to" links | Free queue, no official time | `nofollow` per the skill; strong for "X alternative" searches | `bot wall`; FAQ confirms the flow |
| 6 | **Peerlist Launchpad** | https://peerlist.io (verified profile, **Work** tab, **New project**) | No fee found in its docs | Verified profile; project 100% complete (name, links, description, screenshots) | Launches on Mondays | Profile backlink plus a developer audience | `bot wall`; docs at https://help.peerlist.io/individual/launchpad |
| 7 | **r/SaaS** | https://www.reddit.com/r/SaaS | Free | Title and text post. Read the pinned thread first | None | `nofollow`; value is feedback and people who write | `bot wall`; rules not retrievable. Search says promotion is limited to a weekly thread and "non-productive self-promotion" is banned. Confirm the pinned thread by eye |
| 8 | **Startup Stash** | https://startupstash.com (look for the suggest-a-tool link at the foot of a category) | Free | Tool name, URL, short description, category | Not stated | Curated, each category capped at 10 tools, links reported `nofollow` (third party) | Live (HTTP 200); submit path to confirm |
| 9 | **Microlaunch** | https://microlaunch.net | Free basic launch; Pro about $39-49 (skip) | Account, product name, URL, tagline, description, logo, screenshots | Free route queues | Dofollow claimed, DR 54-60 reported, unverified | Live (HTTP 200); terms from search |
| 10 | **OpenLaunch** | https://www.openlaunch.dev | Free per the skill list | Product name, URL, tagline, description | Not stated | Listed as dofollow in `directory-list.md` | Live (HTTP 200); form unseen |
| 11 | **SideProjectors** | https://www.sideprojectors.com | Free | Project name, URL, description, category | Not stated | Listed as dofollow, DR about 35 | Live (HTTP 200); form unseen |
| 12 | **Uneed** | https://www.uneed.best | Free launch queue; "fast-track" $15-30 (skip) | Name, live URL, 60-character tagline, 250-character description, square logo, 2-3 screenshots, pricing model, all required | Queue, date assigned | Reported dofollow by some sources, nofollow by others | `bot wall`; fields from a third party. Free tier reportedly needs 10 upvotes to stay free |
| 13 | **dev.to** | https://dev.to/new | Free | Title, markdown body, up to 4 tags | None | Canonical-link field lets you credit the original; article links are followed or not at the platform's choice | Live; use only for a real tutorial (see below) |
| 14 | **Hashnode** | https://hashnode.com | Free | Same as dev.to | None | Own-domain blog option | Live; same rule as dev.to |
| 15 | **r/freelance** | https://www.reddit.com/r/freelance | Free | Text post | None | `nofollow`; only for the freelance tools | `bot wall`; read the sidebar by eye before posting |
| 16 | **Crozdesk** | https://www.crozdesk.com | Free listing per the skill list | Vendor profile, product, category | Not stated | Listed as dofollow, DR about 55 | Live (HTTP 200); weak fit, last resort |
| 17 | **Twelve Tools** (`reciprocal`) | https://twelve.tools/submit | Free plan; Pro $36 | Tool URL and details; free plan requires a Twelve Tools backlink on your homepage or footer | Free within 72 h | 1 dofollow link on free, 3 on Pro (read from https://twelve.tools/pricing) | Verified from its pricing page |
| 18 | **Fazier** (`reciprocal`) | https://fazier.com/submit | Basic free; paid $29-$99 (skip) | Basic needs a Fazier backlink on your homepage or footer | Basic: within 30 days | Dofollow on paid tiers only | Verified from https://fazier.com/submit |

### Dropped, with the reason

| Target | Why |
|---|---|
| BetaList | A 2026-10 review reports every submission is paid; older sources describe a months-long free queue. Pre-launch focus, and the site is live. Check the end of its form for the price before deciding. |
| Turbo0, ScrollLaunch, LaunchPanda | Free listing only while their badge stays up: link exchange. |
| Stork, Better Launch | Sell backlink packages. |
| G2, Capterra, GetApp, TrustRadius | Worthless without reviews and for software with accounts; there are none. |
| TAAFT, Futurepedia, Toolify and the other AI directories | The tools are not AI products; a wrong-category listing is rejected and burns the account. |
| DevHunt | Developer-tools audience; wrong fit. |
| Bulk "submit to 300 directories" services, press-release and article farms (Tier 11 of the skill list), social bookmarking rings | Link-scheme risk against a site that already ranks at position 50. Not worth it. |
| Product Hunt "upvote groups" and asking friends to vote | Violates Hacker News rules and Product Hunt's anti-manipulation filters. |

## Part 2. Copy to paste

Rules for all copy:

- Product name: **FounderCalc**. URL on every submission:
  `https://foundercalc.dev/?utm_source=<channel>&utm_medium=referral&utm_campaign=backlinks`
  (replace `<channel>`, for example `saashub`). Lets Cloudflare Web Analytics
  split visits per listing, same as `docs/SOCIAL.md` does for X. If a form
  rejects query strings, paste the bare URL.
- Vary the opening of the long description per tier. Do not paste the same
  paragraph everywhere (the skill's Rule 3). The variants are below.
- Logo: no logo file is in the repo (`static/img/favicon.svg` only). Sites that
  demand a square PNG will need one made first. Skip those until it exists.
- Screenshots: take 3 at 1920x1080 with Playwright from the live site, for
  example `/tools/stripe-fee-calculator/`, `/tools/runway-calculator/`, and the
  home page. Real pages, not mockups.

### Core fields (reuse and trim)

**Name:** FounderCalc

**One-line (under 10 words):** Free business calculators for founders and freelancers.

**160 characters or less (this one is 134):**
`Free business calculators for founders: Stripe fees, MRR, LTV/CAC, runway, margins, freelance rates. Runs in your browser, no sign-up.`

**Category:** Business Tools / Finance / Calculators. If the form offers a fixed list, pick in this order: Finance, Business Tools, Productivity.

**Tags (8):** calculators, saas metrics, stripe fees, startup runway, freelance, pricing, unit economics, finance

**Pricing:** Free. Optional paid embeds without the credit link (Pro, EUR 12/month).

### Variant A. Startup / launch sites (Product Hunt, Peerlist, Microlaunch, OpenLaunch, SideProjectors, Uneed)

Tagline: `The 10-second answer to a founder's money questions.`

Long:

> FounderCalc is a set of free business calculators for the questions founders
> keep re-deriving in spreadsheets: what Stripe really pays out on a charge,
> how many months of runway a burn rate buys, whether LTV to CAC is healthy,
> what hourly rate a salary target implies.
>
> There are 105 calculators across 12 categories: payments, SaaS growth and
> retention metrics, pricing and margins, freelance, cash flow, valuation, tax
> and HR. Each one sits next to a written explanation of its formula and the
> assumptions behind it, so you can check the maths instead of trusting a black
> box.
>
> Everything runs in your browser. No account, no upload, no tracking cookie.
> Every calculator can be embedded on your own site with an iframe. The
> calculators are written by one person, in plain JavaScript, with unit tests on
> the formulas.

### Variant B. SaaS / software directories (SaaSHub, AlternativeTo, Crozdesk, Startup Stash)

Tagline: `Free, no-sign-up calculators for SaaS metrics and payment fees.`

Long:

> FounderCalc covers the metric and fee calculators that SaaS builders and
> freelancers usually rebuild in a spreadsheet: MRR and ARR, LTV, CAC and
> payback, churn and net revenue retention, burn multiple, Rule of 40, runway,
> Stripe, PayPal and Shopify fees, margins, break-even and freelance rates.
>
> Unlike spreadsheet templates it needs no download or login, and unlike hosted
> dashboards it needs no connection to your Stripe account: you type the
> numbers, the maths runs locally in the browser. 105 calculators, free, each
> with a documented formula.
>
> Typical use: check whether a $9 plan survives card fees, set a freelance day
> rate, or see how long the cash lasts before a hiring decision.

AlternativeTo wants an "alternative to": only add it where true. The honest set is spreadsheets-like products for single calculators (for example a Stripe fee calculator is an alternative to the fee table on Stripe's pricing page, which is not an app listing). If no listed app is a fair comparison, skip AlternativeTo. A wrong alternative gets rejected.

### Variant C. Founder communities and builder profiles (Indie Hackers product page, Peerlist profile, dev.to bio)

> I build FounderCalc, a free set of 105 business calculators for indie
> founders and freelancers: Stripe fees, MRR, LTV/CAC, runway, margins and
> freelance rates. It is a static site in plain HTML and JavaScript, the
> formulas are unit tested and written out under each calculator. No sign-up.
> Embeddable on any site.

### Variant D. Short form (any "describe in 60/100 characters" field)

- 60: `Free business calculators for founders. No sign-up.`
- 100: `105 free calculators for founders: Stripe fees, MRR, LTV/CAC, runway, margins. Runs in your browser.`

## Part 3. Launch posts

Each draft is a starting point to be rewritten in Guillaume's own voice before
posting. A post that reads like a template gets flagged. Every number in them
comes from the recomputed table above.

### 3.1 Indie Hackers

Where: https://www.indiehackers.com, sign in, **New Post**. Choose the group
for sharing what you built or for SaaS if one fits (names of groups were not
retrievable: pick the closest by eye and read its pinned rules).

Community norms (from the skill and third-party guides, not an official rulebook):
post a story with numbers, not a link drop; ask one real question; answer every
comment; do not ask for upvotes; do not paste the same post in several groups.
Warm the account up first: comment usefully on 5-10 other people's posts over a
week before posting.

Title: `A $0.30 fixed card fee takes 6.2% of a $9 plan and 3.2% of a $100 invoice (I built a calculator for it)`

Body:

> I kept re-deriving Stripe's fee in a spreadsheet every time I priced
> something, so I put it in a small tool and then kept going until I had 105 of
> them.
>
> The thing that surprised me, using the standard US card rate (2.9% + $0.30):
>
> - $9 charge: about $0.56 fee, **6.2%**, you keep $8.44
> - $29 charge: about $1.14, 3.9%
> - $100 charge: $3.20, **3.2%**
>
> Same card, same processor, double the effective rate, because the $0.30 is
> fixed. If you want to net exactly $9.00 after fees you have to charge $9.58.
> Numbers are from the calculator's own formula (I ran its JS in Node to check,
> not by hand). Stripe rounds each fee to the cent, so real payouts differ by a
> fraction of a cent.
>
> The collection is free, no sign-up, everything runs in the browser, and each
> calculator has the formula written out under it so you can check it. The
> categories I use most: runway, LTV/CAC, burn multiple, freelance rate.
>
> Two things I would like feedback on: which calculator you rebuild most often
> that I do not have, and whether the written formula under each tool is useful
> or just noise.
>
> Stripe fee calculator: https://foundercalc.dev/tools/stripe-fee-calculator/?utm_source=indiehackers&utm_medium=referral&utm_campaign=backlinks

Success sign: the post appears under the group feed, and within 24 h at least
one comment that is not you. Log the post URL in the tracker.

### 3.2 r/SaaS

Where: https://www.reddit.com/r/SaaS. **Before anything else**, open the
sidebar rules and the pinned posts by eye. Search results disagree on whether
promotion lives in a weekly feedback thread or is allowed when relevant, and
the subreddit bans "non-productive self-promotion". If a weekly thread is
pinned, put the short version of this post as a comment there instead of a
top-level post. Never post the same text to r/startups or r/Entrepreneur on the
same day.

Reddit norms: the account needs history before it posts anything with a link.
Spend a week answering questions in r/SaaS first (no links), then post. Put the
link in the first comment, not in the title.

Title: `Why small SaaS plans lose 6% to card fees, with the arithmetic`

Body:

> Pricing a $9/month plan? Card fees scale badly at low prices. Using the
> standard US card rate of 2.9% + $0.30:
>
> | Charge | Fee | % of charge |
> |---|---|---|
> | $5 | $0.45 | 8.9% |
> | $9 | $0.56 | 6.2% |
> | $29 | $1.14 | 3.9% |
> | $100 | $3.20 | 3.2% |
>
> Two things follow. A $9 plan and a $29 plan do not scale linearly in what you
> keep, and annual billing helps more than the headline discount suggests:
> twelve $9 charges pay twelve $0.30 fixed fees, one $108 charge pays one.
>
> The formula is `fee = amount x 2.9% + 0.30`, and to net a target amount `T` you
> charge `(T + 0.30) / (1 - 0.029)`, which is $9.58 for $9.00.
>
> I turned this into a free calculator and have been adding the other
> questions I keep re-deriving (LTV/CAC, burn multiple, runway). Link in the
> first comment so this post stays about the maths. What fees surprised you the
> most?

First comment (post it yourself right after):

> Calculator, with the formula written out under it, no sign-up:
> https://foundercalc.dev/tools/stripe-fee-calculator/?utm_source=reddit-saas&utm_medium=referral&utm_campaign=backlinks
> Disclosure: I built it.

Check the maths in the body: twelve fees of $0.30 is $3.60; one charge of $108
at 2.9% + $0.30 is $3.43, against twelve $9 charges at $0.561 each = $6.73.
(Recomputed: `12*0.561 = 6.732`, `108*0.029+0.30 = 3.432`.) Add that line if
there is room.

Success sign: post not removed after an hour (refresh logged out in a private
window: it must still show). A removal means the rule was misread: do not repost,
message the moderators politely instead.

### 3.3 Hacker News, Show HN

Where: https://news.ycombinator.com/submit. Rules read from
https://news.ycombinator.com/showhn.html on 2026-10-12: the work must be
something people can try, non-trivial, made by the poster, who is available to
discuss it; it should be usable without sign-up; blog posts, landing pages and
lists do **not** qualify; asking friends to upvote or comment is not allowed.

Risk: a bundle of 105 calculators can read as a list. Submit **one tool** that
has a technical angle, and keep the collection for the first comment.

Title (under 80 characters): `Show HN: Stripe fee calculator that solves for the charge needed to net X`

URL: `https://foundercalc.dev/tools/stripe-fee-calculator/`
(no UTM on HN; it makes the link look like marketing).

First comment, posted immediately by Guillaume:

> I got tired of re-deriving this: given the amount you want to receive, what
> do you charge so that after 2.9% + $0.30 you keep exactly that? Solving
> `T = C - (C x r + f)` for C gives `C = (T + f) / (1 - r)`, so netting $9.00
> means charging $9.58. The same fixed fee is 6.2% of a $9 charge and 3.2% of a
> $100 one, which is why low price plans feel worse than the headline rate
> suggests.
>
> It is plain JavaScript with no framework and no backend. Everything runs in
> the browser, nothing is sent anywhere, and the formulas are unit tested in
> Node. The pure functions are separate from the DOM code, which is how the
> numbers in this comment were checked against the tool itself.
>
> It is one of 105 small calculators (runway, LTV/CAC, burn multiple, freelance
> rate...). Which formulas would you want to see checked or explained
> differently? Known limitation: it does not model Stripe's rounding to the
> cent, currency conversion fees or disputes.

Success sign: the post is listed at https://news.ycombinator.com/newest and at
https://news.ycombinator.com/shownew. If it never shows there, it was killed or
caught by a filter. Do not repost the same day; wait at least a few days and
change the title. Never message people for votes.

### Optional article (dev.to or Hashnode)

Only after posts 3.1 and 3.3 have produced comments you can learn from. Title:
`Solving for the charge that nets X after card fees`. Body: the derivation from
3.3 with the table, 600-800 words. Set the canonical URL field to the tool page
if the content is first published on foundercalc.dev. Publish at one platform,
not both on the same day. Link once, in context.

## Part 4. The embed backlink angle

Every calculator already ships a copy-paste embed: the "Embed this calculator
on your site" box on its tool page (`templates/tool.html`). It is two lines. The
second line, outside the iframe, is the backlink the embedder places:

```html
<iframe src="https://foundercalc.dev/embed/stripe-fee-calculator/" title="Stripe Fee Calculator" width="100%" height="640" style="border:0;max-width:760px" loading="lazy"></iframe>
<p style="font-size:13px"><a href="https://foundercalc.dev/tools/stripe-fee-calculator/">Stripe Fee Calculator</a> by FounderCalc</p>
```

What to tell a blogger: the calculator runs in the visitor's browser, nothing
the reader types leaves the page, it works on WordPress, Webflow, Ghost and
plain HTML, and the only cost is the small credit line. Pro (EUR 12/month)
removes the credit, which is the paid upsell, not part of this outreach.

Which bloggers: people who already wrote a post whose subject is the number a
calculator computes. Find them with these searches (run by a human):

| Tool to offer | Search to find the post |
|---|---|
| `stripe-fee-calculator` | `"stripe fees" "how much does stripe charge" blog` |
| `runway-calculator` | `"startup runway" "how to calculate" blog` |
| `ltv-cac-calculator` | `"LTV to CAC" "good ratio" blog saas` |
| `freelance-rate-calculator` | `"how to set your freelance rate"` |
| `saas-quick-ratio-calculator` | `"SaaS quick ratio" explained` |

Qualify before writing: the post is a real article (not a content farm), under
two years old or still updated, has no calculator of its own at that spot, and
names a contact (an author page, not a generic form). Skip anything that is a
listicle of paid tools or sells links.

### Outreach email template

Send from a real address, one at a time, to one named person. Fill the three
bracketed fields by reading the post; if you cannot write a specific first
sentence, do not send.

Subject: `A calculator for your post on [topic]`

> Hi [first name],
>
> I read your piece on [exact title] and liked [one specific thing, such as
> the worked example for X]. One gap I noticed: it explains the formula but
> readers cannot try their own numbers.
>
> I run FounderCalc, a free set of business calculators. The [tool name] one
> matches your post: https://foundercalc.dev/tools/[slug]/
>
> You can embed it under your formula section with two lines of HTML, free, no
> sign-up. It runs in the reader's browser and sends nothing anywhere. The only
> thing it asks for is the small credit link that sits under it. The code is in
> the "Embed this calculator" box on that page.
>
> If it is not useful, ignore this, no follow-up. Thanks for the post either
> way.
>
> Guillaume
> FounderCalc, foundercalc.dev

Rules:

- One email per person, at most one follow-up after 7 days, then stop.
- At most 5 emails per week for the first month. A burst of identical mails
  is what gets a sender domain flagged. Use the real address of the site (see
  `content/pages/contact.md`), never a throwaway.
- Do not offer money or free Pro keys for links. A paid or traded link is a
  sponsored link by Google's definition and would have to carry
  `rel="sponsored"`.
- Never edit or comment on their site yourself.
- Log each send in the tracker with the date and the tool offered.
- Success sign: a reply, then the live post. Verify the credit link by looking
  at the page source for `href="https://foundercalc.dev/tools/`.

## Part 5. Order of operations

Principles: one channel a day at most, and never two community posts in the
same week from the same account. Directories go in small batches. Wait for each
channel's reaction before opening the next. This takes about five weeks and
roughly 20 to 30 minutes on most days.

### Day 0, before anything (30 minutes)

1. Open https://foundercalc.dev and confirm the home page and
   `/tools/stripe-fee-calculator/` load and compute (type 9, result must read
   fee about $0.56, net about $8.44).
2. Run `make gsc` from the repo to see the current indexed count, and save the
   Search Console numbers (impressions, clicks, position) in the tracker as the
   baseline.
3. In Cloudflare Web Analytics, note the current daily visits. This is what the
   campaign is measured against.
4. Make the tracker: copy
   `.claude/skills/directory-submissions/references/submission-tracker-template.csv`
   to a private sheet and keep only the targets in Part 1.
5. Take the three screenshots (Part 2) and, if a logo is wanted, make a square
   PNG of the favicon.
6. Create or confirm the accounts you will use, with the same name and a real
   photo: Indie Hackers, Hacker News, Reddit, Product Hunt. Do not post. This
   starts the clock on account age.

### Week 1: foundation and warm-up

| Day | One channel | Action | Success sign |
|---|---|---|---|
| Mon | SaaSHub | Part 1 #2 with Variant B. Verify the listing with an email on `foundercalc.dev` (or the meta tag) | Listing page loads; "verified" shown. Then `curl -fsSL <listing> | grep -i foundercalc` shows the anchor and its `rel` |
| Tue | Warm-up only | 10 minutes: 3 useful comments on Indie Hackers posts, 2 helpful answers in r/SaaS, no links | Comments stay visible |
| Wed | Startup Stash | Part 1 #8, Variant B short | Confirmation message or email |
| Thu | Warm-up only | Same as Tuesday, on Hacker News comments you genuinely have something to say about | Comments visible |
| Fri | OpenLaunch | Part 1 #10, Variant A | Listing visible |

### Week 2: first community post and one more batch

| Day | Channel | Action | Success sign |
|---|---|---|---|
| Tue | **Indie Hackers post** | Part 3.1. Reply to every comment the same day | At least one outside comment within 24 h |
| Wed | (reply day) | Only replies | n/a |
| Thu | Microlaunch | Part 1 #9, Variant A | Free-plan confirmation shown |
| Fri | Indie Hackers product page | Variant C, link `?utm_source=indiehackers-profile` | Product page live |

### Week 3: Show HN and the first outreach

| Day | Channel | Action | Success sign |
|---|---|---|---|
| Tue or Wed | **Show HN** | Part 3.3, at a weekday morning in US time. Post the first comment yourself | Appears on `/shownew`; at least one comment that is a question |
| Thu | (reply day) | Replies only | n/a |
| Fri | Embed outreach, first batch | Part 4, 3 emails | Sent folder logged |

### Week 4: Product Hunt and the Monday launch

| Day | Channel | Action | Success sign |
|---|---|---|---|
| Mon | Peerlist Launchpad | Part 1 #6, Variant A; the project must be 100% complete | Launch visible on the Monday launchpad |
| Wed | Product Hunt | Only if the account has some history and 14 days were spent preparing the page. Use Variant A, post the first comment as the founder, ask for feedback, never upvotes. Launch window 12:01 AM Pacific | Listing live; comments from people other than you |
| Fri | Embed outreach | 3 more emails | Logged |

Skip Product Hunt if it is not ready. A weak launch there does not hurt the
others, a rushed one wastes the best slot.

### Week 5: r/SaaS and the long tail

| Day | Channel | Action | Success sign |
|---|---|---|---|
| Tue | **r/SaaS** | Part 3.2, after re-reading the pinned thread | Still visible in a private window after an hour |
| Thu | AlternativeTo | Only if a fair "alternative to" exists (Variant B) | Approval email |
| Fri | SideProjectors, Uneed | One per week. Uneed's free tier may want 10 upvotes: do not ask for any, accept a slower queue | Listing live |

### Week 6 and later

- r/freelance: only for the freelance rate calculator, once, if the sidebar permits tools.
- dev.to or Hashnode article (Part 3, optional), one platform.
- Outreach: 5 emails a week for 4 weeks, then stop and measure.
- Decide on the reciprocal sites (Fazier basic, Twelve Tools free) only after
  Guillaume decides whether a footer badge is acceptable.

### Spam-safe rules (apply to every day above)

1. Never post the same text on two platforms; the drafts above deliberately differ.
2. Never ask for votes or comments, privately or publicly.
3. Disclose "I built it" in every post and comment where the link appears.
4. At most one new directory per day, and no more than 3 in a week.
5. Reply to every comment within a day for the first three days.
6. If a post is removed or flagged, stop that channel for 30 days and read the rules again.
7. No paid placements, no link exchanges, no purchased packs.

### Measurement (after week 6)

- Search Console: compare impressions, clicks and average position with the
  Day 0 baseline. Backlinks take weeks to show; judge at 6 to 8 weeks.
- Search Console, **Links** report, "Top linking sites": count of new domains.
- Cloudflare Web Analytics: visits by `utm_source`.
- Bing Webmaster Tools, AI Performance: Copilot citations (see `CLAUDE.md`).
- Tracker: one line per target with date, live URL, observed `rel` and result.
- If after 8 weeks fewer than five new linking domains exist, the likely
  fix is more outreach and more content on the best-performing tool, not
  more directories.

### The AdSense side effect

AdSense's refusals cite low user interest. Real visitors from communities and
embeds help that signal more than any listing. Do not request another review
until `make gsc` (see `CLAUDE.md` § Search Console) reports the retired URLs
are mostly out of the index and the Cloudflare analytics show a steady baseline
of human visits.
