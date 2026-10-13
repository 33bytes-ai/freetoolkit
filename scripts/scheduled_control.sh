#!/usr/bin/env bash
# Dated stop-rule controls for foundercalc (HUMAN_INPUTS.md § F), run unattended
# by ~/.config/systemd/user/foundercalc-control-{1,2}.timer.
# Read-only: drives the signed-in Playwright browser, writes one report, changes
# nothing in the repo and merges nothing. Usage: scheduled_control.sh 1|2
set -euo pipefail
stage="${1:?stage 1 or 2}"
repo="${FOUNDERCALC_REPO:-$HOME/workspace/projets/business/freetoolkit}"
out="$repo/reports/control-$stage-$(date +%F).md"
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"

common='You are running unattended from a systemd timer. Use ONLY the Playwright MCP tools to read dashboards (never click anything that submits, spends, publishes or changes settings), and write ONE markdown report to the path given below with the Write tool. If a page shows a login wall, stop, write a report saying which service needs a sign-in in the Playwright browser, and give no verdict. Report format: date, each number with where you read it, the verdict, the one recommended next step. Be factual; if a number could not be read, say so instead of estimating.'

case "$stage" in
1) task="CONTROL 1 of 2 (rule: foundercalc guide citations are back). Bing Webmaster Tools, site https://foundercalc.dev/ : open https://www.bing.com/webmasters/aiperformance?siteUrl=https://foundercalc.dev/ (wait ~8 s, content is in an iframe; use browser_evaluate/browser_find on the page text). (a) Read the daily Total Citations row of the line-chart table for the last 7 days (baseline on 2026-10-05..11 was about 9 per day site-wide; the peak was 169 on 2026-09-21). (b) Open the Pages tab and read the citation count of https://foundercalc.dev/tools/npv-calculator/how-to-choose-discount-rate/ (it had 720 over the 90 days to 2026-10-12) and of https://foundercalc.dev/tools/npv-calculator/ . (c) Open https://www.bing.com/webmasters/urlinspection?siteUrl=https%3A%2F%2Ffoundercalc.dev%2F&urlToInspect=https%253A%252F%252Ffoundercalc.dev%252Ftools%252Fnpv-calculator%252Fhow-to-choose-discount-rate%252F and read the index status. VERDICT: PASS if the guide's own daily citations average >= 40/day over the last 7 days when a per-URL daily series is available, otherwise PASS if the site-wide 7-day average is >= 60/day; else FAIL (then the rule says: put foundercalc in maintenance, no more content or AdSense work). Also say whether the guide is indexed."
   ;;
2) task="CONTROL 2 of 2 (rule: do guide visitors click partners). Cloudflare dashboard: open https://dash.cloudflare.com/905441e2d04c807f82de1c09b834c945/web-analytics/overview/visits?siteTag~in=1dbee9915c18468ea93ce18a65fe88d0&excludeBots=Yes&time-window=43200 (Last 30 days, bots excluded), wait ~10 s, click the Path button next to All/Referer/Host/Country, and read every path that starts with /go/ and its visits, plus total visits and the Referer list. Baremetrics clicks live in impact.com, which you cannot read: say that a human must check them. VERDICT: PASS if /go/ paths total >= 5 visits (counts are rounded to tens) ; FAIL if 0-4 and no Baremetrics click is known. FAIL means maintenance mode per HUMAN_INPUTS.md section F."
   ;;
*) echo "stage must be 1 or 2" >&2; exit 2 ;;
esac

mkdir -p "$repo/reports"
cd "$repo"
timeout 1500 claude -p "$common Write the report to $out . $task" \
  --allowedTools "mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_wait_for,mcp__playwright__browser_find,mcp__playwright__browser_evaluate,mcp__playwright__browser_click,mcp__playwright__browser_tabs,Read,Write" \
  --permission-mode default >"$repo/reports/control-$stage.log" 2>&1 || echo "claude exited $?" >>"$repo/reports/control-$stage.log"
[ -s "$out" ] && echo "report: $out" || echo "NO REPORT WRITTEN, see reports/control-$stage.log" >&2
