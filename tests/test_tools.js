// Unit tests for FounderCalc JavaScript calculator pure functions.
// Requires Node >= 18 (uses node:test built-in runner).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const TOOLS = path.resolve(__dirname, "..", "static", "js", "tools");

// ---- stripe-fee-calculator ----
const stripe = require(path.join(TOOLS, "stripe-fee-calculator.js"));

test("stripe: standard domestic fee", () => {
  const result = stripe.calculateFee(100, 0.029, 0.30);
  assert.ok(Math.abs(result.fee - 3.20) < 0.01);
  assert.ok(Math.abs(result.net - 96.80) < 0.01);
  assert.equal(result.chargeAmount, 100);
});

test("stripe: passthrough — receive exactly 100", () => {
  const result = stripe.calculatePassthrough(100, 0.029, 0.30);
  assert.ok(Math.abs(result.net - 100) < 0.01);
  assert.ok(result.chargeAmount > 100);
  assert.ok(Math.abs(result.fee - (result.chargeAmount - 100)) < 0.001);
});

test("stripe: calculate() validates negative amount", () => {
  const result = stripe.calculate(-10, 0.029, 0.30, false);
  assert.equal(result, null);
});

test("stripe: international card rate 4.4%", () => {
  const result = stripe.calculateFee(100, 0.044, 0.30);
  assert.ok(Math.abs(result.fee - 4.70) < 0.01);
  assert.ok(Math.abs(result.net - 95.30) < 0.01);
});

// ---- mrr-calculator ----
const mrr = require(path.join(TOOLS, "mrr-calculator.js"));

test("mrr: two plans", () => {
  const total = mrr.calculateMRR([
    { price: "49", subscribers: "10" },
    { price: "99", subscribers: "5" },
  ]);
  assert.equal(total, 490 + 495);
});

test("mrr: empty plan ignored", () => {
  const total = mrr.calculateMRR([
    { price: "100", subscribers: "5" },
    { price: "", subscribers: "" },
  ]);
  assert.equal(total, 500);
});

test("mrr: projectMRR 0% growth stays flat", () => {
  assert.equal(mrr.projectMRR(1000, 0, 12), 1000);
});

test("mrr: projectMRR 10% monthly for 1 month", () => {
  assert.ok(Math.abs(mrr.projectMRR(1000, 10, 1) - 1100) < 0.01);
});

// ---- ltv-cac-calculator ----
const ltv = require(path.join(TOOLS, "ltv-cac-calculator.js"));

test("ltv: basic LTV calculation", () => {
  // LTV = (99 * 0.75) / 0.03 = 2475
  const result = ltv.calculateLTV(99, 75, 3);
  assert.ok(Math.abs(result - 2475) < 0.1);
});

test("ltv: cac calculation", () => {
  const cac = ltv.calculateCAC(5000, 20);
  assert.equal(cac, 250);
});

test("ltv: payback period", () => {
  // payback = 250 / (99 * 0.75) = 250 / 74.25 ≈ 3.37 months
  const payback = ltv.calculatePayback(250, 99, 75);
  assert.ok(Math.abs(payback - 3.37) < 0.1);
});

test("ltv: healthLabel ratios", () => {
  assert.match(ltv.healthLabel(0.5), /losing money/i);
  assert.match(ltv.healthLabel(2), /below 3/i);
  assert.match(ltv.healthLabel(4), /healthy/i);
  assert.match(ltv.healthLabel(6), /underinvesting/i);
});

// ---- runway-calculator ----
const runway = require(path.join(TOOLS, "runway-calculator.js"));

test("runway: basic runway calculation", () => {
  // cash=200k, expenses=25k, revenue=8k → netBurn=17k → months=200000/17000≈11.76
  const result = runway.calculateRunway(200000, 25000, 8000);
  assert.ok(Math.abs(result.months - (200000 / 17000)) < 0.01);
  assert.equal(result.profitable, false);
});

test("runway: profitable business", () => {
  const result = runway.calculateRunway(100000, 10000, 15000);
  assert.equal(result.profitable, true);
  assert.equal(result.months, Infinity);
});

test("runway: months to break-even", () => {
  // expenses=25000, revenue=8000, growth=10% per month
  const months = runway.monthsToBreakEven(25000, 8000, 10);
  assert.ok(months > 0 && months < 100);
  // Verify: after `months` months, revenue >= expenses
});

// ---- churn-impact-calculator ----
const churn = require(path.join(TOOLS, "churn-impact-calculator.js"));

test("churn: 100% churn wipes MRR in 1 month", () => {
  const result = churn.projectMRR(10000, 100, 0, 1);
  assert.equal(result, 0);
});

test("churn: 0% churn with new MRR grows linearly", () => {
  const result = churn.projectMRR(10000, 0, 1000, 3);
  assert.equal(result, 13000);
});

test("churn: 5% churn without new MRR decays over 12 months", () => {
  const result = churn.projectMRR(10000, 5, 0, 12);
  const expected = 10000 * Math.pow(0.95, 12);
  assert.ok(Math.abs(result - expected) < 0.01);
});

test("churn: reduction value is positive", () => {
  const saved = churn.churnReductionValue(10000, 5, 1, 500, 12);
  assert.ok(saved > 0);
});

// ---- freelance-rate-calculator ----
const fr = require(path.join(TOOLS, "freelance-rate-calculator.js"));

test("freelance: basic rate calculation", () => {
  const result = fr.calculateFreelanceRate({
    annualTarget: 80000,
    taxRatePct: 30,
    annualExpenses: 6000,
    billableWeeks: 46,
    billableHoursPct: 70,
    hoursPerWeek: 40,
  });
  assert.ok(result !== null);
  assert.ok(result.hourlyRate > 80);
  assert.ok(result.hourlyRate < 300);
  assert.ok(result.dayRate === result.hourlyRate * 8);
});

test("freelance: tax rate 0 reduces rate", () => {
  const r0 = fr.calculateFreelanceRate({ annualTarget: 100000, taxRatePct: 0, annualExpenses: 0, billableWeeks: 50, billableHoursPct: 100, hoursPerWeek: 40 });
  const r30 = fr.calculateFreelanceRate({ annualTarget: 100000, taxRatePct: 30, annualExpenses: 0, billableWeeks: 50, billableHoursPct: 100, hoursPerWeek: 40 });
  assert.ok(r0.hourlyRate < r30.hourlyRate);
});

// ---- salary-to-hourly-calculator ----
const s2h = require(path.join(TOOLS, "salary-to-hourly-calculator.js"));

test("salary-to-hourly: standard 100k/40h/52w", () => {
  const result = s2h.salaryToHourly(100000, 40, 52);
  assert.ok(Math.abs(result.hourly - 100000 / 2080) < 0.001);
});

test("salary-to-hourly: after-tax is less than gross", () => {
  const result = s2h.salaryToHourly(100000, 40, 52);
  const afterTax = s2h.afterTaxHourly(result.hourly, 25);
  assert.ok(afterTax < result.hourly);
  assert.ok(Math.abs(afterTax - result.hourly * 0.75) < 0.001);
});

test("salary-to-hourly: part-time 20 hours doubles hourly", () => {
  const full = s2h.salaryToHourly(80000, 40, 52);
  const part = s2h.salaryToHourly(80000, 20, 52);
  assert.ok(Math.abs(part.hourly - full.hourly * 2) < 0.01);
});

// ---- profit-margin-calculator ----
const pm = require(path.join(TOOLS, "profit-margin-calculator.js"));

test("profit-margin: 75% gross margin", () => {
  const result = pm.calculateMargins(100, 25, 0, 0);
  assert.ok(Math.abs(result.grossMargin - 75) < 0.01);
  assert.equal(result.grossProfit, 75);
});

test("profit-margin: operating profit", () => {
  const result = pm.calculateMargins(500000, 125000, 200000, 0);
  assert.equal(result.grossProfit, 375000);
  assert.equal(result.operatingProfit, 175000);
  assert.ok(Math.abs(result.operatingMargin - 35) < 0.01);
});

test("profit-margin: negative net margin after taxes", () => {
  const result = pm.calculateMargins(1000, 600, 200, 300);
  assert.ok(result.netProfit < 0);
});

// ---- break-even-calculator ----
const be = require(path.join(TOOLS, "break-even-calculator.js"));

test("break-even: standard calculation", () => {
  // fixed=15000, price=99, variable=12 → contribution=87 → units=172.4 → revenue=17072
  const result = be.calculateBreakEven(15000, 99, 12);
  assert.ok(result.ok);
  assert.ok(Math.abs(result.contributionMargin - 87) < 0.01);
  assert.ok(Math.abs(result.breakEvenUnits - 15000 / 87) < 0.01);
  assert.ok(Math.abs(result.contributionMarginPct - 87 / 99 * 100) < 0.01);
});

test("break-even: zero-contribution margin fails", () => {
  const result = be.calculateBreakEven(15000, 50, 50);
  assert.ok(!result.ok);
});

test("break-even: negative contribution margin fails", () => {
  const result = be.calculateBreakEven(15000, 30, 50);
  assert.ok(!result.ok);
});

// ---- vat-calculator ----
const vat = require(path.join(TOOLS, "vat-calculator.js"));

test("vat: add 20%", () => {
  const result = vat.addVAT(100, 20);
  assert.equal(result.net, 100);
  assert.equal(result.tax, 20);
  assert.equal(result.gross, 120);
});

test("vat: remove 20%", () => {
  const result = vat.removeVAT(120, 20);
  assert.ok(Math.abs(result.net - 100) < 0.001);
  assert.ok(Math.abs(result.tax - 20) < 0.001);
  assert.equal(result.gross, 120);
});

test("vat: add and remove are inverses", () => {
  const added = vat.addVAT(250, 23);
  const removed = vat.removeVAT(added.gross, 23);
  assert.ok(Math.abs(removed.net - 250) < 0.001);
});

test("vat: calculate() dispatch", () => {
  const addResult = vat.calculate(100, 20, "add");
  assert.equal(addResult.gross, 120);

  const removeResult = vat.calculate(120, 20, "remove");
  assert.ok(Math.abs(removeResult.net - 100) < 0.001);
});

// ---- paypal-fee-calculator ----
const paypal = require(path.join(TOOLS, "paypal-fee-calculator.js"));

test("paypal: standard domestic fee 3.49% + $0.49", () => {
  const result = paypal.calculateFee(100, 0.0349, 0.49);
  assert.ok(Math.abs(result.fee - 3.98) < 0.01);
  assert.ok(Math.abs(result.net - 96.02) < 0.01);
});

test("paypal: passthrough — receive exactly 50", () => {
  const result = paypal.calculatePassthrough(50, 0.0349, 0.49);
  assert.ok(Math.abs(result.net - 50) < 0.01);
  assert.ok(result.chargeAmount > 50);
});

test("paypal: calculate() rejects negative amount", () => {
  assert.equal(paypal.calculate(-5, 0.0349, 0.49, false), null);
});

// ---- arr-mrr-converter ----
const amrr = require(path.join(TOOLS, "arr-mrr-converter.js"));

test("arr-mrr: mrr to arr is ×12", () => {
  const result = amrr.convert(1000, "mrr");
  assert.equal(result.arr, 12000);
  assert.equal(result.mrr, 1000);
});

test("arr-mrr: arr to mrr is ÷12", () => {
  const result = amrr.convert(120000, "arr");
  assert.equal(result.mrr, 10000);
  assert.equal(result.arr, 120000);
});

test("arr-mrr: daily revenue approx mrr/30.4", () => {
  const result = amrr.convert(3044, "mrr");
  assert.ok(result.daily > 99 && result.daily < 101);
});

// ---- nps-calculator ----
const nps = require(path.join(TOOLS, "nps-calculator.js"));

test("nps: basic calculation 60p/25pa/15d", () => {
  const result = nps.calculateNPS(60, 25, 15);
  // promoters% = 60%, detractors% = 15%, NPS = 45
  assert.equal(result.nps, 45);
});

test("nps: all detractors yields -100", () => {
  const result = nps.calculateNPS(0, 0, 10);
  assert.equal(result.nps, -100);
});

test("nps: all promoters yields +100", () => {
  const result = nps.calculateNPS(10, 0, 0);
  assert.equal(result.nps, 100);
});

test("nps: zero respondents returns null", () => {
  assert.equal(nps.calculateNPS(0, 0, 0), null);
});

test("nps: npsLabel thresholds", () => {
  assert.match(nps.npsLabel(-10), /needs improvement/i);
  assert.match(nps.npsLabel(20),  /good/i);
  assert.match(nps.npsLabel(50),  /great/i);
  assert.match(nps.npsLabel(75),  /excellent/i);
});

// ---- rule-of-40-calculator ----
const r40 = require(path.join(TOOLS, "rule-of-40-calculator.js"));

test("rule-of-40: 60% growth -15% margin = 45", () => {
  assert.ok(Math.abs(r40.rule40Score(60, -15) - 45) < 0.01);
});

test("rule-of-40: label below 40", () => {
  assert.match(r40.rule40Label(30), /below 40/i);
});

test("rule-of-40: label passes at 40", () => {
  assert.match(r40.rule40Label(40), /passes/i);
});

// ---- price-impact-calculator ----
const pi = require(path.join(TOOLS, "price-impact-calculator.js"));

test("price-impact: current revenue 100×49=4900", () => {
  const result = pi.calculatePriceImpact(49, 100, 69);
  assert.equal(result.currentRevenue, 4900);
  assert.equal(result.fullRetentionRevenue, 6900);
});

test("price-impact: break-even retention 4900/6900", () => {
  const result = pi.calculatePriceImpact(49, 100, 69);
  assert.ok(Math.abs(result.breakEvenRetention - (4900/6900)*100) < 0.01);
});

test("price-impact: same price means 100% break-even", () => {
  const result = pi.calculatePriceImpact(50, 100, 50);
  assert.ok(Math.abs(result.breakEvenRetention - 100) < 0.01);
});

// ---- shopify-fee-calculator ----
const shopify = require(path.join(TOOLS, "shopify-fee-calculator.js"));

test("shopify: basic plan with shopify payments", () => {
  const result = shopify.calculateShopifyFee(100, "basic", true);
  // 2.9% + $0.30 = $3.20, no transaction fee
  assert.ok(Math.abs(result.processingFee - 3.20) < 0.01);
  assert.equal(result.transactionFee, 0);
});

test("shopify: basic plan with 3rd-party gateway adds 2%", () => {
  const result = shopify.calculateShopifyFee(100, "basic", false);
  assert.ok(Math.abs(result.transactionFee - 2.0) < 0.01);
  assert.ok(result.totalFee > result.processingFee);
});

test("shopify: invalid amount returns null", () => {
  assert.equal(shopify.calculateShopifyFee(0, "basic", true), null);
});

// ---- freelance-project-estimate ----
const fpe = require(path.join(TOOLS, "freelance-project-estimate.js"));

test("freelance-estimate: 40h at $125 = $5000 base", () => {
  const result = fpe.estimateProject(125, 40, 0);
  assert.equal(result.baseCost, 5000);
  assert.equal(result.contingency, 0);
  assert.equal(result.total, 5000);
});

test("freelance-estimate: 20% contingency adds correct buffer", () => {
  const result = fpe.estimateProject(100, 10, 20);
  assert.equal(result.baseCost, 1000);
  assert.equal(result.contingency, 200);
  assert.equal(result.total, 1200);
});

test("freelance-estimate: days = hours / 8", () => {
  const result = fpe.estimateProject(100, 40, 0);
  assert.equal(result.days, 5);
});

test("freelance-estimate: invalid input returns null", () => {
  assert.equal(fpe.estimateProject(0, 40, 20), null);
});

// ---- cac-by-channel-calculator ----
const cac = require(path.join(TOOLS, "cac-by-channel-calculator.js"));

test("cac: single channel", () => {
  const result = cac.analyzeChannels([{ name: "Paid", spend: "5000", customers: "20" }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].cac, 250);
});

test("cac: sorts by ascending cac", () => {
  const result = cac.analyzeChannels([
    { name: "Expensive", spend: "10000", customers: "10" },
    { name: "Cheap",     spend: "1000",  customers: "10" },
  ]);
  assert.ok(result[0].cac < result[1].cac);
  assert.equal(result[0].name, "Cheap");
});

test("cac: zero customers row excluded", () => {
  const result = cac.analyzeChannels([
    { name: "Good",  spend: "1000", customers: "10" },
    { name: "Empty", spend: "500",  customers: "0"  },
  ]);
  assert.equal(result.length, 1);
});

test("cac: totalStats blended cac", () => {
  const stats = cac.totalStats([
    { name: "A", spend: "4000", customers: "20" },
    { name: "B", spend: "6000", customers: "30" },
  ]);
  // total spend=10000, customers=50, blended CAC=200
  assert.equal(stats.blendedCAC, 200);
});

// ---- pricing-tier-comparison ----
const pt = require(path.join(TOOLS, "pricing-tier-comparison.js"));

test("pricing-tier: sorts by mrr descending", () => {
  const result = pt.compareTiers([
    { name: "Cheap", price: 29,  convRate: 4   },
    { name: "Pro",   price: 99,  convRate: 1.5 },
  ], 1000);
  assert.ok(result[0].mrr > result[1].mrr);
});

test("pricing-tier: mrr = visitors × convRate/100 × price", () => {
  const result = pt.compareTiers([{ name: "A", price: 100, convRate: 2 }], 1000);
  assert.ok(Math.abs(result[0].mrr - 2000) < 0.01);
});

test("pricing-tier: serializeTiers round-trips correctly", () => {
  const tiers = [
    { name: "Starter", price: 29, convRate: 4 },
    { name: "Pro", price: 99, convRate: 1.5 },
  ];
  const str = pt.serializeTiers(tiers);
  const back = pt.deserializeTiers(str);
  assert.equal(back[0].name, "Starter");
  assert.equal(back[0].price, "29");
  assert.equal(back[1].name, "Pro");
});

test("pricing-tier: deserializeTiers returns null for empty string", () => {
  assert.equal(pt.deserializeTiers(""), null);
  assert.equal(pt.deserializeTiers(null), null);
});

// ---- sales-quota-calculator ----
const sq = require(path.join(TOOLS, "sales-quota-calculator.js"));

test("sales-quota: 1M ARR at 12k ACV = 83.3 deals", () => {
  const result = sq.calculateQuota(1000000, 12000, 20, 45);
  assert.ok(Math.abs(result.dealsNeeded - 1000000/12000) < 0.01);
});

test("sales-quota: leads = deals / close rate", () => {
  const result = sq.calculateQuota(1000000, 12000, 20, 45);
  const expected = (1000000/12000) / 0.20;
  assert.ok(Math.abs(result.leadsNeeded - expected) < 0.01);
});

test("sales-quota: zero acv returns null", () => {
  assert.equal(sq.calculateQuota(1000000, 0, 20, 45), null);
});

// ---- email-roi-calculator ----
const email = require(path.join(TOOLS, "email-roi-calculator.js"));

test("email-roi: opens = list × open rate", () => {
  const result = email.calculateEmailROI(1000, 20, 10, 5, 100, 0);
  assert.equal(result.opens, 200);
});

test("email-roi: revenue chain is correct", () => {
  // 1000 × 20% open × 10% click × 5% conv × $100 AOV = 200×20×1×$100 = $100
  const result = email.calculateEmailROI(1000, 20, 10, 5, 100, 0);
  assert.ok(Math.abs(result.revenue - 100) < 0.01);
});

test("email-roi: roi is (revenue - cost) / cost", () => {
  const result = email.calculateEmailROI(1000, 50, 20, 10, 200, 100);
  const expectedRev = 1000 * 0.5 * 0.2 * 0.1 * 200;
  const expectedROI = (expectedRev - 100) / 100 * 100;
  assert.ok(Math.abs(result.roi - expectedROI) < 0.1);
});

// ---- invoice-total-calculator ----
const inv = require(path.join(TOOLS, "invoice-total-calculator.js"));

test("invoice: two items sum correctly", () => {
  const result = inv.calculateInvoice(
    [{ qty: "1", price: "2500" }, { qty: "40", price: "125" }],
    0, 0
  );
  assert.equal(result.subtotal, 7500);
  assert.equal(result.total, 7500);
});

test("invoice: discount reduces after-discount amount", () => {
  const result = inv.calculateInvoice([{ qty: "1", price: "1000" }], 10, 0);
  assert.equal(result.discount, 100);
  assert.equal(result.afterDiscount, 900);
});

test("invoice: tax applied after discount", () => {
  const result = inv.calculateInvoice([{ qty: "1", price: "1000" }], 0, 20);
  assert.equal(result.tax, 200);
  assert.equal(result.total, 1200);
});

test("invoice: combined discount and tax", () => {
  // 1000, 10% discount = 900, 20% tax on 900 = 180, total = 1080
  const result = inv.calculateInvoice([{ qty: "1", price: "1000" }], 10, 20);
  assert.ok(Math.abs(result.total - 1080) < 0.01);
});

// ---- common.js — hashGet / hashSet / shareURL ----
function loadCommonWithHash(hash) {
  const win = {
    setTimeout: function () {},
    location: { hash: hash || "", pathname: "/tools/stripe-fee-calculator/", search: "" },
    history: { replaceState: function (s, t, url) { win.location.hash = url.includes("#") ? url.slice(url.indexOf("#")) : ""; } },
  };
  const nav = { clipboard: { writeText: function () { return Promise.resolve(); } }, share: undefined };
  const fn = new Function(
    "navigator", "window",
    require("fs").readFileSync(
      require("path").resolve(__dirname, "..", "static", "js", "lib", "common.js"),
      "utf8"
    )
  );
  fn(nav, win);
  return win.FTK;
}

test("hashGet: returns empty object when no hash", () => {
  const ftk = loadCommonWithHash("");
  assert.deepEqual(ftk.hashGet(), {});
});

test("hashGet: parses JSON from URL hash", () => {
  const encoded = "#" + encodeURIComponent(JSON.stringify({ a: 100, t: "domestic" }));
  const ftk = loadCommonWithHash(encoded);
  const result = ftk.hashGet();
  assert.equal(result.a, 100);
  assert.equal(result.t, "domestic");
});

test("hashGet: returns empty object for malformed hash", () => {
  const ftk = loadCommonWithHash("#not-valid-json%");
  assert.deepEqual(ftk.hashGet(), {});
});

test("hashSet: encodes object into URL hash", () => {
  const ftk = loadCommonWithHash("");
  ftk.hashSet({ a: 250, t: "international" });
  // After hashSet, hashGet should return the same object
  const result = ftk.hashGet();
  assert.equal(result.a, 250);
  assert.equal(result.t, "international");
});

// ---- common.js — copyToClipboard ----
function loadCommon(writeText) {
  const win = { setTimeout: function () {} };
  const nav = writeText !== undefined ? { clipboard: { writeText: writeText } } : {};
  const fn = new Function(
    "navigator", "window",
    require("fs").readFileSync(
      require("path").resolve(__dirname, "..", "static", "js", "lib", "common.js"),
      "utf8"
    )
  );
  fn(nav, win);
  return win.FTK;
}

test("copyToClipboard: resolves when clipboard API available", async () => {
  const ftk = loadCommon(function () { return Promise.resolve(); });
  await assert.doesNotReject(ftk.copyToClipboard("hello"));
});

test("copyToClipboard: rejects when clipboard API unavailable", async () => {
  const ftk = loadCommon(undefined);
  await assert.rejects(ftk.copyToClipboard("hello"), /HTTPS/);
});

test("copyToClipboard: forwards rejection from writeText", async () => {
  const ftk = loadCommon(function () { return Promise.reject(new Error("denied")); });
  await assert.rejects(ftk.copyToClipboard("hello"), /denied/);
});

// ---- tracker DNT ----
// Simulate the tracker IIFE in Node by shimming browser globals.
function loadTracker(dntValue, initialData) {
  const ftk = {};
  const nav = { doNotTrack: dntValue, msDoNotTrack: undefined };
  const win = { doNotTrack: undefined, FTK: ftk, location: { pathname: "/test/" } };
  const ls = {
    data: initialData ? { "ftk_analytics": JSON.stringify(initialData) } : {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = v; },
    removeItem(k) { delete this.data[k]; },
  };
  const doc = { addEventListener() {}, querySelector() { return null; } };
  const fn = new Function(
    "navigator", "window", "localStorage", "document", "Date",
    require("fs").readFileSync(
      require("path").resolve(__dirname, "..", "static", "js", "lib", "tracker.js"),
      "utf8"
    )
  );
  fn(nav, win, ls, doc, Date);
  return { win, ls };
}

test("tracker: DNT=1 sets dnt flag and skips localStorage", () => {
  const { win, ls } = loadTracker("1");
  assert.equal(win.FTK.analytics.dnt, true);
  assert.equal(Object.keys(ls.data).length, 0);
});

test("tracker: DNT=0 writes pageview to localStorage", () => {
  const { win, ls } = loadTracker("0");
  assert.equal(win.FTK.analytics.dnt, undefined);
  assert.ok(Object.keys(ls.data).length > 0);
});

test("tracker: no DNT header writes pageview to localStorage", () => {
  const { win, ls } = loadTracker(null);
  assert.equal(win.FTK.analytics.dnt, undefined);
  assert.ok(Object.keys(ls.data).length > 0);
});

test("tracker: DNT=1 trackCalcUse is a no-op", () => {
  const { win, ls } = loadTracker("1");
  win.FTK.analytics.trackCalcUse("stripe");
  assert.equal(Object.keys(ls.data).length, 0);
});

test("tracker: DNT=1 load returns null", () => {
  const { win } = loadTracker("1");
  assert.equal(win.FTK.analytics.load(), null);
});

test("tracker: TTL expired — stale data is cleared and fresh data returned", () => {
  const staleSeen = Date.now() - (31 * 24 * 60 * 60 * 1000);
  const { win, ls } = loadTracker(null, {
    pageviews: { "/old/": 99 },
    calc_uses: {},
    affiliate_clicks: {},
    first_seen: staleSeen,
  });
  // After init, load() should return fresh data (stale data was wiped)
  const data = win.FTK.analytics.load();
  assert.ok(!data.pageviews["/old/"]);
  assert.ok(data.first_seen > staleSeen);
});

test("tracker: TTL not expired — existing data is preserved", () => {
  const recentSeen = Date.now() - (10 * 24 * 60 * 60 * 1000);
  const { win } = loadTracker(null, {
    pageviews: { "/kept/": 5 },
    calc_uses: { "stripe": 3 },
    affiliate_clicks: {},
    first_seen: recentSeen,
  });
  const data = win.FTK.analytics.load();
  assert.equal(data.calc_uses["stripe"], 3);
});

test("tracker: size limit — pageviews cleared when data exceeds 50 KB", () => {
  const bigPageviews = {};
  for (let i = 0; i < 2000; i++) {
    bigPageviews["/tools/very-long-page-slug-" + i + "/section/detail/"] = i + 1;
  }
  const rawSize = JSON.stringify({ pageviews: bigPageviews, calc_uses: {}, affiliate_clicks: {}, first_seen: Date.now() }).length;
  assert.ok(rawSize > 50 * 1024, "test setup: initial data must be > 50 KB");

  const { ls } = loadTracker(null, {
    pageviews: bigPageviews,
    calc_uses: {},
    affiliate_clicks: {},
    first_seen: Date.now(),
  });

  const stored = JSON.parse(ls.data["ftk_analytics"]);
  assert.deepEqual(stored.pageviews, {});
});

// ---- payment-fee-comparison ----
const pfc = require(path.join(TOOLS, "payment-fee-comparison.js"));

test("payment-fee-comparison: calcNet basic", () => {
  const r = pfc.calcNet(100, 0.029, 0.30);
  assert.ok(Math.abs(r.fee - 3.20) < 0.01);
  assert.ok(Math.abs(r.net - 96.80) < 0.01);
  assert.ok(Math.abs(r.effectiveRate - 3.20) < 0.01);
});

test("payment-fee-comparison: Stripe has lower fee than PayPal Standard on $100", () => {
  const stripe = pfc.PROCESSORS.find(p => p.name === "Stripe");
  const paypal = pfc.PROCESSORS.find(p => p.name === "PayPal Standard");
  const stripeResult = pfc.calcNet(100, stripe.rate, stripe.fixed);
  const paypalResult = pfc.calcNet(100, paypal.rate, paypal.fixed);
  assert.ok(stripeResult.net > paypalResult.net, "Stripe should net more than PayPal Standard");
});

test("payment-fee-comparison: Shopify Basic nets more than Stripe on $100", () => {
  const shopify = pfc.PROCESSORS.find(p => p.name.startsWith("Shopify Basic"));
  const stripe = pfc.PROCESSORS.find(p => p.name === "Stripe");
  const shopifyResult = pfc.calcNet(100, shopify.rate, shopify.fixed);
  const stripeResult = pfc.calcNet(100, stripe.rate, stripe.fixed);
  assert.ok(shopifyResult.net > stripeResult.net, "Shopify Basic should net more than Stripe");
});

// ---- subscription-churn-revenue ----
const scr = require(path.join(TOOLS, "subscription-churn-revenue.js"));

test("subscription-churn-revenue: monthly loss = mrr * churn/100", () => {
  const r = scr.calcChurnRevenueLoss(10000, 3);
  assert.ok(Math.abs(r.monthlyLoss - 300) < 0.01);
});

test("subscription-churn-revenue: annual loss = 12 * monthly", () => {
  const r = scr.calcChurnRevenueLoss(10000, 3);
  assert.ok(Math.abs(r.annualLoss - 3600) < 0.01);
});

test("subscription-churn-revenue: avg customer life at 5% = 20 months", () => {
  const r = scr.calcChurnRevenueLoss(5000, 5);
  assert.ok(Math.abs(r.avgCustomerLife - 20) < 0.01);
});

test("subscription-churn-revenue: calcNewMrrNeeded = churn + growth delta", () => {
  // $10k MRR, 3% churn, 5% growth target
  // churned = 300, growth = 500, total = 800
  const needed = scr.calcNewMrrNeeded(10000, 3, 5);
  assert.ok(Math.abs(needed - 800) < 0.01);
});

// ---- arr-growth-rate-calculator ----
const agr = require(path.join(TOOLS, "arr-growth-rate-calculator.js"));

test("arr-growth-rate: 100% growth from 600k to 1.2M", () => {
  const rate = agr.calcARRGrowth(1200000, 600000);
  assert.ok(Math.abs(rate - 100) < 0.01);
});

test("arr-growth-rate: negative growth", () => {
  const rate = agr.calcARRGrowth(800000, 1000000);
  assert.ok(Math.abs(rate - (-20)) < 0.01);
});

test("arr-growth-rate: years to target = log ratio / log growth", () => {
  // from 1M to 10M at 100% growth
  const years = agr.calcYearsToTarget(1000000, 10000000, 100);
  assert.ok(Math.abs(years - Math.log(10) / Math.log(2)) < 0.01);
});

test("arr-growth-rate: returns null when previous is 0", () => {
  assert.equal(agr.calcARRGrowth(1000000, 0), null);
});

// ---- saas-pricing-calculator ----
const spc = require(path.join(TOOLS, "saas-pricing-calculator.js"));

test("saas-pricing: calcMinPrice at 75% margin with $8 COGS = $32", () => {
  const min = spc.calcMinPrice(8, 75);
  assert.ok(Math.abs(min - 32) < 0.01);
});

test("saas-pricing: calcMinPrice returns null at 100% margin", () => {
  assert.equal(spc.calcMinPrice(10, 100), null);
});

test("saas-pricing: calcTierRevenue correct", () => {
  const mrr = spc.calcTierRevenue(99, 100, 40);
  assert.ok(Math.abs(mrr - 99 * 40) < 0.01);
});

test("saas-pricing: calcAnnualDiscount 17% off $49/mo = $487.56/yr", () => {
  const annual = spc.calcAnnualDiscount(49, 17);
  assert.ok(Math.abs(annual - 49 * 12 * 0.83) < 0.01);
});

// ---- customer-health-score ----
const chs = require(path.join(TOOLS, "customer-health-score.js"));

test("customer-health-score: perfect scores = 100", () => {
  const score = chs.calcHealthScore({ usage: 100, engagement: 100, nps: 100, support: 100, growth: 100 });
  assert.equal(score, 100);
});

test("customer-health-score: all zeros = 0", () => {
  const score = chs.calcHealthScore({ usage: 0, engagement: 0, nps: 0, support: 0, growth: 0 });
  assert.equal(score, 0);
});

test("customer-health-score: weighted average is correct", () => {
  // 70*0.30 + 65*0.25 + 60*0.20 + 80*0.15 + 50*0.10 = 21+16.25+12+12+5 = 66.25 → 66
  const score = chs.calcHealthScore({ usage: 70, engagement: 65, nps: 60, support: 80, growth: 50 });
  assert.equal(score, 66);
});

test("customer-health-score: healthLabel at 80 = Healthy", () => {
  const info = chs.healthLabel(80);
  assert.match(info.label, /Healthy/i);
});

test("customer-health-score: healthLabel at 30 = Critical", () => {
  const info = chs.healthLabel(30);
  assert.match(info.label, /Critical/i);
});

// unit-economics-calculator
const ue = require("../static/js/tools/unit-economics-calculator.js");

test("unit-economics: calcPaybackMonths basic", () => {
  // 1200 / (99 * 0.75) = 16.16...
  const result = ue.calcPaybackMonths(1200, 99, 75);
  assert.ok(Math.abs(result - 16.16) < 0.01, `expected ~16.16 got ${result}`);
});

test("unit-economics: calcLTV basic", () => {
  // 99 * 0.75 * 36 = 2673
  const result = ue.calcLTV(99, 75, 36);
  assert.equal(result, 2673);
});

test("unit-economics: calcLTVCAC basic", () => {
  // 2673 / 1200 = 2.2275
  const result = ue.calcLTVCAC(2673, 1200);
  assert.ok(Math.abs(result - 2.2275) < 0.001);
});

test("unit-economics: calcMagicNumber basic", () => {
  // 400000 / 200000 = 2.0
  const result = ue.calcMagicNumber(400000, 200000);
  assert.equal(result, 2.0);
});

test("unit-economics: returns null on invalid margin", () => {
  assert.equal(ue.calcPaybackMonths(1200, 99, 0), null);
  assert.equal(ue.calcPaybackMonths(1200, 99, 100), null);
});

// revenue-growth-calculator
const rg = require("../static/js/tools/revenue-growth-calculator.js");

test("revenue-growth: calcGrowthRate basic", () => {
  // (150000 - 120000) / 120000 * 100 = 25
  const result = rg.calcGrowthRate(150000, 120000);
  assert.equal(result, 25);
});

test("revenue-growth: calcGrowthRate negative", () => {
  // (90000 - 120000) / 120000 * 100 = -25
  const result = rg.calcGrowthRate(90000, 120000);
  assert.equal(result, -25);
});

test("revenue-growth: calcCAGR over 3 years", () => {
  // (4000000/500000)^(1/3) - 1 = 8^(1/3) - 1 = 2 - 1 = 1 → 100%
  const result = rg.calcCAGR(4000000, 500000, 3);
  assert.ok(Math.abs(result - 100) < 0.01, `expected 100% got ${result}`);
});

test("revenue-growth: calcDoublingTime rule of 72", () => {
  // 72 / 36 = 2
  const result = rg.calcDoublingTime(36);
  assert.equal(result, 2);
});

test("revenue-growth: returns null on zero prior", () => {
  assert.equal(rg.calcGrowthRate(100, 0), null);
  assert.equal(rg.calcCAGR(100, 0, 1), null);
});

// nrr-calculator
const nrr = require("../static/js/tools/nrr-calculator.js");

test("nrr: calcNRR basic (108%)", () => {
  // (100000 + 15000 - 3000 - 4000) / 100000 * 100 = 108
  const result = nrr.calcNRR(100000, 15000, 3000, 4000);
  assert.equal(result, 108);
});

test("nrr: calcNRR above 100 with high expansion", () => {
  const result = nrr.calcNRR(100000, 30000, 5000, 5000);
  assert.equal(result, 120);
});


test("nrr: returns null on zero starting MRR", () => {
  assert.equal(nrr.calcNRR(0, 5000, 0, 0), null);
});

// burn-multiple-calculator
const bm = require("../static/js/tools/burn-multiple-calculator.js");

test("burn-multiple: calcBurnMultiple basic", () => {
  // 200000 / 400000 = 0.5
  const result = bm.calcBurnMultiple(200000, 400000);
  assert.equal(result, 0.5);
});

test("burn-multiple: calcBurnMultiple above 1", () => {
  const result = bm.calcBurnMultiple(500000, 200000);
  assert.equal(result, 2.5);
});

test("burn-multiple: calcRunwayMonths basic", () => {
  // 3000000 / 200000 = 15
  const result = bm.calcRunwayMonths(3000000, 200000);
  assert.equal(result, 15);
});

test("burn-multiple: returns null on zero net new ARR", () => {
  assert.equal(bm.calcBurnMultiple(200000, 0), null);
});

test("burn-multiple: burnLabel for negative bm = exceptional", () => {
  const label = bm.burnLabel(-0.5);
  assert.match(label.text, /exceptional/i);
  assert.equal(label.type, "info");
});

// email-list-growth-calculator
const elg = require("../static/js/tools/email-list-growth-calculator.js");

test("email-list-growth: calcNetGrowth basic", () => {
  // 300 - (5000 * 0.02) = 300 - 100 = 200
  const result = elg.calcNetGrowth(5000, 300, 2);
  assert.equal(result, 200);
});

test("email-list-growth: calcNetGrowth negative (shrinking)", () => {
  // 50 - (5000 * 0.05) = 50 - 250 = -200
  const result = elg.calcNetGrowth(5000, 50, 5);
  assert.equal(result, -200);
});

test("email-list-growth: calcGrowthRate basic", () => {
  // 200 / 5000 * 100 = 4%
  const result = elg.calcGrowthRate(5000, 200);
  assert.equal(result, 4);
});

test("email-list-growth: calcMonthsToTarget reachable", () => {
  const months = elg.calcMonthsToTarget(5000, 300, 2, 10000);
  assert.ok(months !== null, "Should reach target");
  assert.ok(months > 0 && months < 200, `Expected reasonable months, got ${months}`);
});

test("email-list-growth: calcMonthsToTarget already at target", () => {
  // target <= listSize
  const result = elg.calcMonthsToTarget(10000, 300, 2, 5000);
  assert.equal(result, 0);
});

// ad-roas-calculator
const roas = require("../static/js/tools/ad-roas-calculator.js");

test("ad-roas: calcROAS basic", () => {
  // 4000 / 1000 = 4
  const result = roas.calcROAS(4000, 1000);
  assert.equal(result, 4);
});

test("ad-roas: calcROAS returns null on zero spend", () => {
  assert.equal(roas.calcROAS(4000, 0), null);
});

test("ad-roas: calcBreakevenROAS 50% margin = 2x", () => {
  // 100 / 50 = 2
  const result = roas.calcBreakevenROAS(50);
  assert.equal(result, 2);
});

test("ad-roas: calcTargetROAS 50% margin 20% target = 3.33x", () => {
  // 100 / (50 - 20) = 100/30 = 3.333...
  const result = roas.calcTargetROAS(50, 20);
  assert.ok(Math.abs(result - 100 / 30) < 0.0001, `Expected ~3.33, got ${result}`);
});

test("ad-roas: roasLabel below breakeven = warning", () => {
  const label = roas.roasLabel(2, 3);
  assert.equal(label.type, "warning");
  assert.match(label.text, /break.?even/i);
});

// customer-ltv-calculator
const cltv = require("../static/js/tools/customer-ltv-calculator.js");

test("customer-ltv: calcLTV basic", () => {
  // 99 * 0.75 * 50 = 3712.5
  const result = cltv.calcLTV(99, 75, 50);
  assert.equal(result, 3712.5);
});

test("customer-ltv: calcLifetimeFromChurn 2% = 50 months", () => {
  const result = cltv.calcLifetimeFromChurn(2);
  assert.equal(result, 50);
});

test("customer-ltv: calcLTVCAC basic", () => {
  // 3712.5 / 500 = 7.425
  const result = cltv.calcLTVCAC(3712.5, 500);
  assert.equal(result, 7.425);
});

test("customer-ltv: calcPaybackMonths basic", () => {
  // 500 / (99 * 0.75) = 500 / 74.25 = 6.734...
  const result = cltv.calcPaybackMonths(500, 99, 75);
  assert.ok(Math.abs(result - 500 / 74.25) < 0.001, `Expected ~6.73, got ${result}`);
});

test("customer-ltv: calcLTV returns null on zero arpu", () => {
  assert.equal(cltv.calcLTV(0, 75, 50), null);
});

// conversion-rate-calculator
const cr = require("../static/js/tools/conversion-rate-calculator.js");

test("cr: calcConversionRate basic", () => {
  // 150 / 10000 * 100 = 1.5
  const result = cr.calcConversionRate(150, 10000);
  assert.equal(result, 1.5);
});

test("cr: calcRevenueFromCR basic", () => {
  // 10000 * 0.015 * 99 = 14850
  const result = cr.calcRevenueFromCR(10000, 1.5, 99);
  assert.equal(result, 14850);
});

test("cr: calcCROImpact basic", () => {
  // (10000 * 0.025 - 10000 * 0.015) * 99 = 1000 * 99 = 9900
  const result = cr.calcCROImpact(10000, 1.5, 2.5, 99);
  assert.equal(result, 9900);
});

test("cr: calcConversionRate zero visitors returns null", () => {
  assert.equal(cr.calcConversionRate(150, 0), null);
});

test("cr: crLabel below 1 = warning", () => {
  const label = cr.crLabel(0.5);
  assert.equal(label.type, "warning");
});

// gross-margin-calculator
const gm = require("../static/js/tools/gross-margin-calculator.js");

test("gm: calcGrossMargin basic", () => {
  // (100000 - 30000) / 100000 * 100 = 70
  const result = gm.calcGrossMargin(100000, 30000);
  assert.equal(result, 70);
});

test("gm: calcGrossProfit basic", () => {
  // 100000 - 30000 = 70000
  const result = gm.calcGrossProfit(100000, 30000);
  assert.equal(result, 70000);
});

test("gm: calcMarkup basic", () => {
  // 70000 / 30000 * 100 = 233.33...
  const result = gm.calcMarkup(30000, 70000);
  assert.ok(Math.abs(result - (70000 / 30000 * 100)) < 0.001, `Expected ~233.33, got ${result}`);
});

test("gm: calcRevenueFromMargin 70% margin", () => {
  // 30000 / (1 - 0.70) = 30000 / 0.30 = 100000
  const result = gm.calcRevenueFromMargin(30000, 70);
  assert.ok(Math.abs(result - 100000) < 0.01, `Expected 100000, got ${result}`);
});

test("gm: calcGrossMargin returns null on zero revenue", () => {
  assert.equal(gm.calcGrossMargin(0, 30000), null);
});

// operating-cash-flow-calculator
const ocf = require("../static/js/tools/operating-cash-flow-calculator.js");

test("ocf: calcOCF basic", () => {
  // 80000 + 15000 + (-10000) = 85000
  const result = ocf.calcOCF(80000, 15000, -10000);
  assert.equal(result, 85000);
});

test("ocf: calcCashConversionRatio basic", () => {
  // 85000 / 80000 = 1.0625
  const result = ocf.calcCashConversionRatio(85000, 80000);
  assert.ok(Math.abs(result - 85000 / 80000) < 0.0001, `Expected ~1.0625, got ${result}`);
});

test("ocf: calcFreeCashFlow basic", () => {
  // 85000 - 5000 = 80000
  const result = ocf.calcFreeCashFlow(85000, 5000);
  assert.equal(result, 80000);
});

test("ocf: calcOCF with null returns null", () => {
  assert.equal(ocf.calcOCF(null, 15000, -10000), null);
});

test("ocf: ocfLabel below 0.8 = warning", () => {
  const label = ocf.ocfLabel(0.5);
  assert.equal(label.type, "warning");
});

// pricing-elasticity-calculator
const pe = require("../static/js/tools/pricing-elasticity-calculator.js");

test("pe: calcElasticity basic", () => {
  // -15 / 10 = -1.5
  const result = pe.calcElasticity(-15, 10);
  assert.equal(result, -1.5);
});

test("pe: calcNewDemand with elasticity -1.2 and 10% price increase", () => {
  // demand change = -1.2 * 10 = -12%
  // new demand = 200 * (1 - 0.12) = 176
  const result = pe.calcNewDemand(200, 10, -1.2);
  assert.equal(result, 176);
});

test("pe: calcRevenueImpact basic", () => {
  // current: 200 * 99 = 19800, new: 176 * 129 = 22704, impact = 2904
  const result = pe.calcRevenueImpact(200, 99, 176, 129);
  assert.equal(result, 22704 - 19800);
});

test("pe: calcElasticity returns null on zero price change", () => {
  assert.equal(pe.calcElasticity(-15, 0), null);
});

test("pe: elasticityLabel for -0.3 = inelastic = info", () => {
  const label = pe.elasticityLabel(-0.3);
  assert.equal(label.type, "info");
});

// payroll-cost-calculator
const pr = require("../static/js/tools/payroll-cost-calculator.js");

test("pr: calcPayrollTax basic (120k salary)", () => {
  // FICA = 120000 * 0.0765 = 9180
  // FUTA = 7000 * 0.006 = 42
  // SUTA = 10000 * 0.027 = 270
  const result = pr.calcPayrollTax(120000, 0.027);
  assert.ok(Math.abs(result - (9180 + 42 + 270)) < 0.01, `Expected ${9492}, got ${result}`);
});

test("pr: calcTotalEmployerCost basic", () => {
  const result = pr.calcTotalEmployerCost(120000, 18000, 0.027);
  const expected = 120000 + pr.calcPayrollTax(120000, 0.027) + 18000;
  assert.ok(Math.abs(result - expected) < 0.01);
});

test("pr: calcEffectiveRate basic", () => {
  // 150000 / 120000 * 100 = 125
  const result = pr.calcEffectiveRate(120000, 150000);
  assert.ok(Math.abs(result - 125) < 0.01);
});

test("pr: calcTotalEmployerCost returns null on zero salary", () => {
  assert.equal(pr.calcTotalEmployerCost(0, 18000, 0.027), null);
});

test("pr: FICA_RATE is 0.0765", () => {
  assert.equal(pr.FICA_RATE, 0.0765);
});

// discount-calculator
const dc = require("../static/js/tools/discount-calculator.js");

test("dc: calcSalePrice 20% off $99 = $79.20", () => {
  const result = dc.calcSalePrice(99, 20);
  assert.ok(Math.abs(result - 79.2) < 0.001, `Expected 79.2, got ${result}`);
});

test("dc: calcDiscountAmount 20% off $99 = $19.80", () => {
  const result = dc.calcDiscountAmount(99, 20);
  assert.ok(Math.abs(result - 19.8) < 0.001, `Expected 19.8, got ${result}`);
});

test("dc: calcDiscountPct $99 to $79.20 = 20%", () => {
  const result = dc.calcDiscountPct(99, 79.2);
  assert.ok(Math.abs(result - 20) < 0.01, `Expected 20, got ${result}`);
});

test("dc: calcMarginAfterDiscount basic", () => {
  // sale price = 79.20, cogs = 30, margin = (79.2 - 30) / 79.2 * 100 = 62.1%
  const result = dc.calcMarginAfterDiscount(99, 20, 30);
  assert.ok(Math.abs(result - (49.2 / 79.2 * 100)) < 0.01, `Expected ~62.1, got ${result}`);
});

test("dc: calcSalePrice returns null on zero price", () => {
  assert.equal(dc.calcSalePrice(0, 20), null);
});

// break-even-revenue-calculator
const ber = require("../static/js/tools/break-even-revenue-calculator.js");

test("be: calcBreakEvenRevenue 25000 fixed / 70% margin = 35714.29", () => {
  const result = ber.calcBreakEvenRevenue(25000, 70);
  assert.ok(Math.abs(result - (25000 / 0.70)) < 0.01, `Expected ~35714.29, got ${result}`);
});

test("be: calcBreakEvenRevenue returns null on zero margin", () => {
  assert.equal(ber.calcBreakEvenRevenue(25000, 0), null);
});


test("be: calcSafetyMargin ($50k revenue, $35714 breakeven) ≈ 28.57%", () => {
  const result = ber.calcSafetyMargin(50000, 25000 / 0.70);
  const expected = (50000 - (25000 / 0.70)) / 50000 * 100;
  assert.ok(Math.abs(result - expected) < 0.01, `Expected ~${expected.toFixed(2)}, got ${result}`);
});

// cac-calculator
const cacc = require("../static/js/tools/cac-calculator.js");

test("cacc: calcCAC 37000 spend / 50 customers = 740", () => {
  const result = cacc.calcCAC(37000, 50);
  assert.ok(Math.abs(result - 740) < 0.01, `Expected 740, got ${result}`);
});

test("cacc: calcPaybackMonths 740 CAC / ($99 ARPU × 75% margin) ≈ 9.97", () => {
  const result = cacc.calcPaybackMonths(740, 99, 75);
  const expected = 740 / (99 * 0.75);
  assert.ok(Math.abs(result - expected) < 0.01, `Expected ~${expected.toFixed(2)}, got ${result}`);
});

test("cacc: calcLTVCACRatio 3712 LTV / 740 CAC ≈ 5.02", () => {
  const result = cacc.calcLTVCACRatio(3712, 740);
  assert.ok(Math.abs(result - (3712 / 740)) < 0.01, `Expected ~5.02, got ${result}`);
});

test("cacc: calcBlendedCAC sums all three cost buckets", () => {
  // 15000 + 20000 + 2000 = 37000 / 50 = 740
  const result = cacc.calcBlendedCAC(15000, 20000, 2000, 50);
  assert.ok(Math.abs(result - 740) < 0.01, `Expected 740, got ${result}`);
});

test("cacc: calcCAC returns null on zero customers", () => {
  assert.equal(cacc.calcCAC(37000, 0), null);
});

// revenue-per-employee-calculator
const rpe = require("../static/js/tools/revenue-per-employee-calculator.js");

test("rpe: calcRevenuePerEmployee 5M / 20 = 250000", () => {
  const result = rpe.calcRevenuePerEmployee(5000000, 20);
  assert.ok(Math.abs(result - 250000) < 0.01, `Expected 250000, got ${result}`);
});

test("rpe: calcHeadcountAtRevenue 5M at $250k RPE target = 20", () => {
  const result = rpe.calcHeadcountAtRevenue(5000000, 250000);
  assert.ok(Math.abs(result - 20) < 0.01, `Expected 20, got ${result}`);
});

test("rpe: calcRevenueAtHeadcount 20 * $250k = 5M", () => {
  const result = rpe.calcRevenueAtHeadcount(20, 250000);
  assert.ok(Math.abs(result - 5000000) < 0.01, `Expected 5000000, got ${result}`);
});

test("rpe: calcCostPerEmployee 2.4M / 20 = 120000", () => {
  const result = rpe.calcCostPerEmployee(2400000, 20);
  assert.ok(Math.abs(result - 120000) < 0.01, `Expected 120000, got ${result}`);
});

test("rpe: calcRevenuePerEmployee returns null on zero headcount", () => {
  assert.equal(rpe.calcRevenuePerEmployee(5000000, 0), null);
});

test("nrr: calcNRR returns null on zero starting MRR", () => {
  assert.equal(nrr.calcNRR(0, 10000, 0, 0), null);
});


// arr-calculator
const arrc = require("../static/js/tools/arr-calculator.js");

test("arrc: calcARR 83333 MRR = 999996 ARR (~$1M)", () => {
  const result = arrc.calcARR(83333);
  assert.ok(Math.abs(result - 999996) < 0.01, `Expected ~999996, got ${result}`);
});

test("arrc: calcMRRFromARR 1200000 ARR = 100000 MRR", () => {
  const result = arrc.calcMRRFromARR(1200000);
  assert.ok(Math.abs(result - 100000) < 0.01, `Expected 100000, got ${result}`);
});

test("arrc: calcARRGrowth 2M -> 1M = 100% growth", () => {
  const result = arrc.calcARRGrowth(2000000, 1000000);
  assert.ok(Math.abs(result - 100) < 0.01, `Expected 100, got ${result}`);
});

test("arrc: calcProjectedARR 1M at 8%/month for 12 months", () => {
  const result = arrc.calcProjectedARR(1000000, 8, 12);
  const expected = 1000000 * Math.pow(1.08, 12);
  assert.ok(Math.abs(result - expected) < 0.01, `Expected ~${expected.toFixed(0)}, got ${result}`);
});

test("arrc: calcARR returns null on zero MRR", () => {
  assert.equal(arrc.calcARR(0), null);
});

// ebitda-calculator
const ebitda = require("../static/js/tools/ebitda-calculator.js");

test("ebitda: calcEBITDA basic (30% margin)", () => {
  // 5M - 750k - 1.5M - 500k - 750k = 1.5M
  const result = ebitda.calcEBITDA(5000000, 750000, 1500000, 500000, 750000);
  assert.ok(Math.abs(result - 1500000) < 0.01, `Expected 1500000, got ${result}`);
});

test("ebitda: calcEBITDAMargin 1.5M / 5M = 30%", () => {
  const result = ebitda.calcEBITDAMargin(1500000, 5000000);
  assert.ok(Math.abs(result - 30) < 0.01, `Expected 30, got ${result}`);
});

test("ebitda: calcEBIT EBITDA 1.5M - D&A 100k = 1.4M", () => {
  const result = ebitda.calcEBIT(1500000, 100000, 0);
  assert.ok(Math.abs(result - 1400000) < 0.01, `Expected 1400000, got ${result}`);
});

test("ebitda: calcImpliedValuation 1.5M * 10x = 15M", () => {
  const result = ebitda.calcImpliedValuation(1500000, 10);
  assert.ok(Math.abs(result - 15000000) < 0.01, `Expected 15000000, got ${result}`);
});

test("ebitda: calcEBITDA returns null on zero revenue", () => {
  assert.equal(ebitda.calcEBITDA(0, 500000, 0, 0, 0), null);
});

// cash-conversion-cycle-calculator
const ccc = require("../static/js/tools/cash-conversion-cycle-calculator.js");

test("ccc: calcDIO 500k inventory / 3M COGS = 60.8 days", () => {
  const result = ccc.calcDIO(500000, 3000000);
  assert.ok(Math.abs(result - (500000 / 3000000 * 365)) < 0.01, `Expected ~60.83, got ${result}`);
});

test("ccc: calcDSO 400k AR / 5M revenue = 29.2 days", () => {
  const result = ccc.calcDSO(400000, 5000000);
  assert.ok(Math.abs(result - (400000 / 5000000 * 365)) < 0.01, `Expected ~29.2, got ${result}`);
});

test("ccc: calcDPO 200k AP / 3M COGS = 24.3 days", () => {
  const result = ccc.calcDPO(200000, 3000000);
  assert.ok(Math.abs(result - (200000 / 3000000 * 365)) < 0.01, `Expected ~24.3, got ${result}`);
});

test("ccc: calcCCC DIO+DSO-DPO = 65.7 days approximately", () => {
  const dio = ccc.calcDIO(500000, 3000000);
  const dso = ccc.calcDSO(400000, 5000000);
  const dpo = ccc.calcDPO(200000, 3000000);
  const result = ccc.calcCCC(dio, dso, dpo);
  const expected = dio + dso - dpo;
  assert.ok(Math.abs(result - expected) < 0.01, `Expected ~${expected.toFixed(1)}, got ${result}`);
});

test("ccc: calcCCC returns null if any component is null", () => {
  assert.equal(ccc.calcCCC(null, 29, 24), null);
});

test("bm: calcNetBurn 5M spent - 2M collected = 3M", () => {
  const result = bm.calcNetBurn(5000000, 2000000);
  assert.ok(Math.abs(result - 3000000) < 0.01, `Expected 3000000, got ${result}`);
});

test("bm: calcRunwayMonths 8M cash / 250k monthly burn = 32 months", () => {
  const result = bm.calcRunwayMonths(8000000, 250000);
  assert.ok(Math.abs(result - 32) < 0.01, `Expected 32, got ${result}`);
});

test("bm: calcCAC 250k monthly burn / 8.33 new customers/month ≈ 30k", () => {
  // 3M annual / 12 = 250k/month, 100/12 = 8.33 customers/month → CAC ≈ 30k
  const result = bm.calcCAC(250000, 100 / 12);
  assert.ok(Math.abs(result - 30000) < 100, `Expected ~30000, got ${result}`);
});

// saas-quick-ratio-calculator
const sqr = require("../static/js/tools/saas-quick-ratio-calculator.js");

test("sqr: calcQuickRatio 65k growth / 15k lost = 4.33x", () => {
  // (50k new + 15k expansion) / (5k contraction + 10k churn) = 65/15 ≈ 4.333
  const result = sqr.calcQuickRatio(50000, 15000, 5000, 10000);
  assert.ok(Math.abs(result - 65 / 15) < 0.001, `Expected ~4.333, got ${result}`);
});

test("sqr: calcQuickRatio returns null when lost MRR is 0", () => {
  assert.equal(sqr.calcQuickRatio(50000, 0, 0, 0), null);
});

test("sqr: calcGrowthMRR 40k new + 20k expansion = 60k", () => {
  assert.equal(sqr.calcGrowthMRR(40000, 20000), 60000);
});

test("sqr: calcLostMRR 3k contraction + 7k churn = 10k", () => {
  assert.equal(sqr.calcLostMRR(3000, 7000), 10000);
});

test("sqr: calcNetNewMRR 60k growth - 10k lost = 50k", () => {
  assert.equal(sqr.calcNetNewMRR(40000, 20000, 3000, 7000), 50000);
});

// magic-number-calculator
const mn = require("../static/js/tools/magic-number-calculator.js");

test("mn: calcMagicNumber 500k ARR / 400k S&M = 1.25", () => {
  const result = mn.calcMagicNumber(500000, 400000);
  assert.ok(Math.abs(result - 1.25) < 0.001, `Expected 1.25, got ${result}`);
});

test("mn: calcMagicNumber returns null on zero S&M spend", () => {
  assert.equal(mn.calcMagicNumber(500000, 0), null);
});

test("mn: calcImpliedCAC 400k spend / 20 customers = 20k", () => {
  assert.equal(mn.calcImpliedCAC(400000, 20), 20000);
});

test("mn: calcAnnualizedSMSpend 100k quarterly = 400k annual", () => {
  assert.equal(mn.calcAnnualizedSMSpend(100000), 400000);
});

test("mn: calcPaybackFromMagicNumber 1.25 at 75% GM = 1.07 quarters", () => {
  // 1 / (1.25 * 0.75) = 1 / 0.9375 ≈ 1.0667
  const result = mn.calcPaybackFromMagicNumber(1.25, 75);
  assert.ok(Math.abs(result - 1 / 0.9375) < 0.001, `Expected ~1.067, got ${result}`);
});

// working-capital-calculator
const wc = require("../static/js/tools/working-capital-calculator.js");

test("wc: calcWorkingCapital 500k assets - 200k liabilities = 300k", () => {
  assert.equal(wc.calcWorkingCapital(500000, 200000), 300000);
});

test("wc: calcCurrentRatio 500k / 200k = 2.5x", () => {
  const result = wc.calcCurrentRatio(500000, 200000);
  assert.ok(Math.abs(result - 2.5) < 0.001, `Expected 2.5, got ${result}`);
});

test("wc: calcCurrentRatio returns null when liabilities = 0", () => {
  assert.equal(wc.calcCurrentRatio(500000, 0), null);
});


// roi-calculator
const roi = require("../static/js/tools/roi-calculator.js");

test("roi: calcROI 100k profit / 100k investment = 100%", () => {
  assert.equal(roi.calcROI(100000, 100000), 100);
});

test("roi: calcROI returns null on zero investment", () => {
  assert.equal(roi.calcROI(50000, 0), null);
});

test("roi: calcNetProfit 150k revenue - 50k costs = 100k", () => {
  assert.equal(roi.calcNetProfit(150000, 50000), 100000);
});

test("roi: calcBreakEvenMonths 100k investment / 10k monthly = 10 months", () => {
  assert.equal(roi.calcBreakEvenMonths(100000, 10000), 10);
});

test("roi: calcAnnualizedROI 100% over 2 years ≈ 41.42%", () => {
  // (1 + 1.0)^(1/2) - 1 = sqrt(2) - 1 ≈ 0.41421
  const result = roi.calcAnnualizedROI(100, 2);
  assert.ok(Math.abs(result - (Math.sqrt(2) - 1) * 100) < 0.001, `Expected ~41.42, got ${result}`);
});

// payback-period-calculator
const pp = require("../static/js/tools/payback-period-calculator.js");

test("pp: calcPaybackYears 200k / 80k = 2.5 years", () => {
  assert.equal(pp.calcPaybackYears(200000, 80000), 2.5);
});

test("pp: calcPaybackMonths 200k / (80k/12) = 30 months", () => {
  // Monthly cash flow = 80k/12 ≈ 6667. 200k / 6667 ≈ 30
  const result = pp.calcPaybackMonths(200000, 80000 / 12);
  assert.ok(Math.abs(result - 30) < 0.1, `Expected ~30, got ${result}`);
});

test("pp: calcPaybackYears returns null on zero cash flow", () => {
  assert.equal(pp.calcPaybackYears(200000, 0), null);
});

test("pp: calcROIAtYear 200k inv / 80k/yr over 5 yrs = 100%", () => {
  // (80k * 5 - 200k) / 200k * 100 = (400k - 200k) / 200k * 100 = 100%
  assert.equal(pp.calcROIAtYear(200000, 80000, 5), 100);
});

test("pp: calcDiscountedPayback 200k at 0% = same as simple (2.5 yrs)", () => {
  const result = pp.calcDiscountedPayback(200000, 80000, 0, 10);
  assert.ok(Math.abs(result - 2.5) < 0.01, `Expected ~2.5, got ${result}`);
});

// arpu-calculator
const arpu = require("../static/js/tools/arpu-calculator.js");

test("arpu: calcARPU 50k MRR / 500 users = $100", () => {
  assert.equal(arpu.calcARPU(50000, 500), 100);
});

test("arpu: calcARPU returns null on zero users", () => {
  assert.equal(arpu.calcARPU(50000, 0), null);
});

test("arpu: calcARPUA 600k ARR / 500 users = $1200/yr", () => {
  assert.equal(arpu.calcARPUA(600000, 500), 1200);
});

test("arpu: calcUsersNeededForMRR 100k target / $100 arpu = 1000 users", () => {
  assert.equal(arpu.calcUsersNeededForMRR(100000, 100), 1000);
});

test("arpu: calcMRRFromUsersAndARPU 1000 users * $100 = $100k", () => {
  assert.equal(arpu.calcMRRFromUsersAndARPU(1000, 100), 100000);
});

// revenue-run-rate-calculator
const rrr = require("../static/js/tools/revenue-run-rate-calculator.js");

test("rrr: calcRunRate 250k over 3 months = 1M ARR", () => {
  assert.equal(rrr.calcRunRate(250000, 3), 1000000);
});

test("rrr: calcRunRate returns null on zero months", () => {
  assert.equal(rrr.calcRunRate(250000, 0), null);
});

test("rrr: calcMonthlyFromRunRate 1.2M ARR = 100k/month", () => {
  assert.equal(rrr.calcMonthlyFromRunRate(1200000), 100000);
});

test("rrr: calcRunRateGrowth from 800k to 1M = 25% growth", () => {
  assert.equal(rrr.calcRunRateGrowth(1000000, 800000), 25);
});

test("rrr: calcProjectedRevenue 100k/mo at 0% for 12 months = 1.2M", () => {
  assert.equal(rrr.calcProjectedRevenue(100000, 0, 12), 1200000);
});

// sales-velocity-calculator
const sv = require("../static/js/tools/sales-velocity-calculator.js");

test("sv: calcSalesVelocity 50 opps 25% win $8k ACV 90 days", () => {
  assert.ok(Math.abs(sv.calcSalesVelocity(50, 25, 8000, 90) - 1111.11) < 0.1);
});

test("sv: calcSalesVelocity returns null on zero opportunities", () => {
  assert.equal(sv.calcSalesVelocity(0, 25, 8000, 90), null);
});

test("sv: calcAnnualRevenue 1000/day = 365000/year", () => {
  assert.equal(sv.calcAnnualRevenue(1000), 365000);
});

test("sv: calcPipelineValue 50 opps * $8k ACV = $400k", () => {
  assert.equal(sv.calcPipelineValue(50, 8000), 400000);
});

test("sv: salesVelocityLabel returns warning for low velocity", () => {
  const label = sv.salesVelocityLabel(50);
  assert.equal(label.type, "warning");
});

// free-cash-flow-calculator
const fcf = require("../static/js/tools/free-cash-flow-calculator.js");

test("fcf: calcFCF 500k OCF - 80k capex = 420k", () => {
  assert.equal(fcf.calcFCF(500000, 80000), 420000);
});

test("fcf: calcFCFMargin 420k FCF / 2M revenue = 21%", () => {
  assert.equal(fcf.calcFCFMargin(420000, 2000000), 21);
});

test("fcf: calcFCFYield 420k FCF / 8.4M market cap = 5%", () => {
  assert.equal(fcf.calcFCFYield(420000, 8400000), 5);
});

test("fcf: calcFCFGrowth from 300k to 420k = 40%", () => {
  assert.ok(Math.abs(fcf.calcFCFGrowth(420000, 300000) - 40) < 0.001);
});

test("fcf: fcfLabel returns warning type for negative margin", () => {
  const label = fcf.fcfLabel(-5);
  assert.equal(label.type, "warning");
});

// equity-dilution-calculator
const ed = require("../static/js/tools/equity-dilution-calculator.js");

test("ed: calcPostMoneyValuation 5M pre + 1M invest = 6M", () => {
  assert.equal(ed.calcPostMoneyValuation(5000000, 1000000), 6000000);
});

test("ed: calcNewSharesIssued 10M shares, 1M invest at 5M pre = 2M new shares", () => {
  assert.equal(ed.calcNewSharesIssued(10000000, 1000000, 5000000), 2000000);
});

test("ed: calcDilutedOwnership 6M existing after 2M new = 75%", () => {
  assert.ok(Math.abs(ed.calcDilutedOwnership(6000000, 2000000) - 75) < 0.001);
});

test("ed: calcInvestorOwnership 2M new shares / 12M total = 16.67%", () => {
  assert.ok(Math.abs(ed.calcInvestorOwnership(2000000, 10000000) - 16.667) < 0.01);
});

test("ed: dilutionLabel returns info type for light dilution", () => {
  const label = ed.dilutionLabel(58, 60);
  assert.equal(label.type, "info");
});

// business-loan-calculator
const bl = require("../static/js/tools/business-loan-calculator.js");

test("bl: calcMonthlyPayment 250k at 7.5% APR 60 months ~= 5009", () => {
  assert.ok(Math.abs(bl.calcMonthlyPayment(250000, 7.5, 60) - 5009) < 1);
});

test("bl: calcMonthlyPayment 0% rate 120k over 12 months = 10k/month", () => {
  assert.equal(bl.calcMonthlyPayment(120000, 0, 12), 10000);
});

test("bl: calcTotalPaid 5000/month × 60 months = 300k", () => {
  assert.equal(bl.calcTotalPaid(5000, 60), 300000);
});

test("bl: calcTotalInterest 300k total - 250k principal = 50k", () => {
  assert.equal(bl.calcTotalInterest(5000, 60, 250000), 50000);
});

test("bl: loanLabel returns info type when payment is low", () => {
  const label = bl.loanLabel(500, 50000);
  assert.equal(label.type, "info");
});

// inventory-turnover-calculator
const ito = require("../static/js/tools/inventory-turnover-calculator.js");

test("inv: calcInventoryTurnover 1.2M COGS / 200k avg = 6.0x", () => {
  assert.equal(ito.calcInventoryTurnover(1200000, 200000), 6);
});

test("inv: calcDSI 6x turnover = 60.83 days", () => {
  assert.ok(Math.abs(ito.calcDSI(6) - 60.833) < 0.01);
});

test("inv: calcAvgInventory 180k + 220k / 2 = 200k", () => {
  assert.equal(ito.calcAvgInventory(180000, 220000), 200000);
});

test("inv: calcSellThroughRate 800 sold / 1000 received = 80%", () => {
  assert.equal(ito.calcSellThroughRate(800, 1000), 80);
});

test("inv: inventoryLabel returns warning for low turnover", () => {
  const label = ito.inventoryLabel(2);
  assert.equal(label.type, "warning");
});

// npv-calculator
const npv = require("../static/js/tools/npv-calculator.js");

test("npv: calcNPV 100k invest, [30k,35k,40k,40k,40k], 10% = positive", () => {
  const result = npv.calcNPV(100000, [30000, 35000, 40000, 40000, 40000], 10);
  assert.ok(result > 0, "NPV should be positive for this scenario");
});

test("npv: calcNPV returns negative for high discount rate", () => {
  const result = npv.calcNPV(100000, [10000, 10000, 10000], 50);
  assert.ok(result < 0, "NPV should be negative at 50% discount rate");
});

test("npv: calcPresentValue 1000 at 10% for 1 year = 909.09", () => {
  assert.ok(Math.abs(npv.calcPresentValue(1000, 10, 1) - 909.09) < 0.01);
});

test("npv: calcProfitabilityIndex positive NPV / 100k = PI > 1", () => {
  const pi = npv.calcProfitabilityIndex(38000, 100000);
  assert.ok(pi > 1, "PI should be > 1 for positive NPV");
  assert.ok(Math.abs(pi - 1.38) < 0.01);
});

test("npv: npvLabel returns warning for negative NPV", () => {
  const label = npv.npvLabel(-5000, 100000);
  assert.equal(label.type, "warning");
});

// revenue-per-lead-calculator
const rpl = require("../static/js/tools/revenue-per-lead-calculator.js");

test("rpl: calcRevenuePerLead 480k revenue / 1200 leads = 400", () => {
  assert.equal(rpl.calcRevenuePerLead(480000, 1200), 400);
});

test("rpl: calcCostPerLead 60k spend / 1200 leads = 50", () => {
  assert.equal(rpl.calcCostPerLead(60000, 1200), 50);
});

test("rpl: calcLeadROI 400 rpl / 50 cpl = 700%", () => {
  assert.equal(rpl.calcLeadROI(400, 50), 700);
});

test("rpl: calcLeadsNeededForRevenue 1.2M target / 400 rpl = 3000 leads", () => {
  assert.equal(rpl.calcLeadsNeededForRevenue(1200000, 400), 3000);
});

test("rpl: rplLabel returns info for high RPL/CPL ratio", () => {
  const label = rpl.rplLabel(400, 50);
  assert.equal(label.type, "info");
});

// customer-concentration-calculator
const cc = require("../static/js/tools/customer-concentration-calculator.js");

test("cc: calcConcentrationRisk [250k,150k] of 1M total = 40%", () => {
  assert.equal(cc.calcConcentrationRisk([250000, 150000], 1000000), 40);
});

test("cc: calcLargestCustomerShare 250k of 1M total = 25%", () => {
  assert.equal(cc.calcLargestCustomerShare(250000, 1000000), 25);
});

test("cc: calcHHIIndex [500k,500k] equal split of 1M = 5000", () => {
  assert.equal(cc.calcHHIIndex([500000, 500000], 1000000), 5000);
});

test("cc: calcConcentrationRisk returns null for empty array", () => {
  assert.equal(cc.calcConcentrationRisk([], 1000000), null);
});

test("cc: concentrationLabel returns warning for high concentration", () => {
  const label = cc.concentrationLabel(80, 35);
  assert.equal(label.type, "warning");
});

// tam-sam-som-calculator
const tsm = require("../static/js/tools/tam-sam-som-calculator.js");

test("tsm: calcTAM 100k customers * $5k spend = $500M", () => {
  assert.equal(tsm.calcTAM(100000, 5000), 500000000);
});

test("tsm: calcSAM 30% of $500M TAM = $150M", () => {
  assert.equal(tsm.calcSAM(500000000, 30), 150000000);
});

test("tsm: calcSOM 5% of $150M SAM = $7.5M", () => {
  assert.equal(tsm.calcSOM(150000000, 5), 7500000);
});

test("tsm: calcRevenueAtMarketShare 1% of $500M TAM = $5M", () => {
  assert.equal(tsm.calcRevenueAtMarketShare(500000000, 1), 5000000);
});

test("tsm: tamLabel returns warning for small TAM", () => {
  const label = tsm.tamLabel(50000000, null);
  assert.equal(label.type, "warning");
  assert.match(label.text, /small/i);
});

// contribution-margin-calculator
const cm = require("../static/js/tools/contribution-margin-calculator.js");

test("cm: calcContributionMargin $99 price - $35 variable = $64", () => {
  assert.equal(cm.calcContributionMargin(99, 35), 64);
});

test("cm: calcContributionMarginRatio $64 CM on $99 = 64.6%", () => {
  assert.ok(Math.abs(cm.calcContributionMarginRatio(99, 35) - (64 / 99 * 100)) < 0.01);
});

test("cm: calcBreakEvenUnits $50k fixed / $64 CM = 782 units", () => {
  assert.equal(cm.calcBreakEvenUnits(50000, 64), 782);
});

test("cm: calcTargetProfitUnits $50k fixed + $20k profit / $64 CM = 1094 units", () => {
  assert.equal(cm.calcTargetProfitUnits(50000, 20000, 64), 1094);
});

test("cm: cmLabel returns warning for low CM ratio", () => {
  const label = cm.cmLabel(18);
  assert.equal(label.type, "warning");
  assert.match(label.text, /low/i);
});

// freelance-tax-estimator
const fte = require("../static/js/tools/freelance-tax-estimator.js");

test("fte: SE_TAX_RATE is 15.3%", () => {
  assert.equal(fte.SE_TAX_RATE, 0.153);
});

test("fte: calcSETax 80k * 15.3% = 12240", () => {
  assert.ok(Math.abs(fte.calcSETax(80000) - 12240) < 0.01);
});

test("fte: calcFederalIncomeTax single at $70k taxable", () => {
  // 11600 * 10% + (47150-11600) * 12% + (70000-47150) * 22%
  // = 1160 + 4266 + 5027 = 10453
  const result = fte.calcFederalIncomeTax(70000, "single");
  assert.ok(Math.abs(result - 10453) < 1, `Expected ~10453, got ${result}`);
});

test("fte: calcQuarterlyPayment returns positive number for $80k profit", () => {
  const quarterly = fte.calcQuarterlyPayment(80000, 0, "single");
  assert.ok(quarterly > 0, "Quarterly payment should be positive");
  assert.ok(quarterly < 20000, "Quarterly payment should be reasonable");
});

test("fte: taxLabel returns info for moderate rate", () => {
  const label = fte.taxLabel(22);
  assert.equal(label.type, "info");
  assert.match(label.text, /moderate/i);
});

// employee-cost-calculator
const ec = require("../static/js/tools/employee-cost-calculator.js");

test("ec: FICA_EMPLOYER is 7.65%", () => {
  assert.equal(ec.FICA_EMPLOYER, 0.0765);
});

test("ec: calcPayrollTaxes for $100k salary includes FICA+FUTA+SUTA", () => {
  const result = ec.calcPayrollTaxes(100000);
  // FICA=7650, FUTA=42, SUTA=189 = 7881
  assert.ok(Math.abs(result - 7881) < 1, `Expected ~7881, got ${result}`);
});

test("ec: calcTotalCost 100k salary + 15k benefits + 10k bonus", () => {
  const result = ec.calcTotalCost(100000, 15000, 10000);
  // salary + benefits + bonus + taxes(~7881) = 132881
  assert.ok(result > 130000 && result < 140000, `Expected ~132881, got ${result}`);
});

test("ec: calcCostMultiplier 100k salary + 15k benefits + 0 bonus ~= 1.23x", () => {
  const result = ec.calcCostMultiplier(100000, 15000, 0);
  assert.ok(result > 1.20 && result < 1.30, `Expected ~1.23x, got ${result}`);
});

test("ec: calcHourlyCost 130k total = $62.50/hr", () => {
  const result = ec.calcHourlyCost(130000);
  assert.ok(Math.abs(result - 130000 / (52 * 40)) < 0.01, `Expected ~62.50, got ${result}`);
});

// price-to-sales-calculator
const psr = require("../static/js/tools/price-to-sales-calculator.js");

test("psr: calcPSRatio 80M mcap / 10M revenue = 8x", () => {
  assert.equal(psr.calcPSRatio(80000000, 10000000), 8);
});

test("psr: calcPSRatio returns null on zero revenue", () => {
  assert.equal(psr.calcPSRatio(80000000, 0), null);
});

test("psr: calcImpliedValuation 10M revenue at 10x = 100M", () => {
  assert.equal(psr.calcImpliedValuation(10000000, 10), 100000000);
});

test("psr: calcImpliedRevenue 100M valuation at 10x = 10M", () => {
  assert.equal(psr.calcImpliedRevenue(100000000, 10), 10000000);
});

test("psr: psLabel returns warning for very high P/S", () => {
  const label = psr.psLabel(20, 30);
  assert.equal(label.type, "warning");
});

// churn-cohort-calculator
const cca = require("../static/js/tools/churn-cohort-calculator.js");

test("cca: calcRetentionRate 200 start, 20 churned = 90%", () => {
  assert.equal(cca.calcRetentionRate(20, 200), 90);
});

test("cca: calcCohortLTV $99/mo at 2% churn = $4950", () => {
  assert.equal(cca.calcCohortLTV(99, 2), 4950);
});

test("cca: calcMonthsToChurn50 at 2% monthly ~= 34 months", () => {
  const result = cca.calcMonthsToChurn50(2);
  assert.ok(Math.abs(result - 34.3) < 0.1, `Expected ~34.3, got ${result}`);
});

test("cca: calcRetentionAtMonth 90% start, 2% monthly churn, 12 months", () => {
  // 90 * (1-0.02)^12 ≈ 90 * 0.7847 ≈ 70.6%
  const result = cca.calcRetentionAtMonth(90, 2, 12);
  assert.ok(Math.abs(result - 70.6) < 0.5, `Expected ~70.6, got ${result}`);
});

test("cca: cohortLabel returns warning for critical retention", () => {
  const label = cca.cohortLabel(25, 12);
  assert.equal(label.type, "warning");
  assert.match(label.text, /critical/i);
});

// segment-margin-calculator
const sgm = require("../static/js/tools/segment-margin-calculator.js");

test("sgm: calcGrossMargin returns correct percentage", () => {
  assert.ok(Math.abs(sgm.calcGrossMargin(1000000, 150000) - 85) < 0.01);
});

test("sgm: calcGrossProfit returns revenue minus cogs", () => {
  assert.equal(sgm.calcGrossProfit(800000, 120000), 680000);
});

test("sgm: calcBlendedMargin weights by revenue correctly", () => {
  const segs = [{ revenue: 800000, cogs: 120000 }, { revenue: 200000, cogs: 120000 }];
  assert.ok(Math.abs(sgm.calcBlendedMargin(segs) - 76) < 0.01);
});

test("sgm: calcRevenueShare returns correct share", () => {
  assert.ok(Math.abs(sgm.calcRevenueShare(800000, 1000000) - 80) < 0.01);
});

test("sgm: segmentLabel returns warning for low blended margin", () => {
  const label = sgm.segmentLabel(20);
  assert.equal(label.type, "warning");
  assert.match(label.text, /low/i);
});

// dso-calculator
const dso = require("../static/js/tools/dso-calculator.js");

test("dso: calcDSO 150k AR, 450k sales, 90 days = 30 days", () => {
  assert.ok(Math.abs(dso.calcDSO(150000, 450000, 90) - 30) < 0.01);
});

test("dso: calcARTurnover 450k sales / 150k AR = 3 (quarterly)", () => {
  assert.ok(Math.abs(dso.calcARTurnover(450000, 150000) - 3) < 0.01);
});

test("dso: calcCashCollected handles start and end AR", () => {
  assert.equal(dso.calcCashCollected(450000, 120000, 150000), 420000);
});

test("dso: calcTargetAR at 30-day DSO with 5000/day = 150000", () => {
  assert.equal(dso.calcTargetAR(5000, 30), 150000);
});

test("dso: dsoLabel returns warning for high DSO", () => {
  const label = dso.dsoLabel(95);
  assert.equal(label.type, "warning");
  assert.match(label.text, /high/i);
});

// roe-calculator
const roe = require("../static/js/tools/roe-calculator.js");

test("roe: calcROE 500k income / 2.5M equity = 20%", () => {
  assert.ok(Math.abs(roe.calcROE(500000, 2500000) - 20) < 0.01);
});

test("roe: calcDupontROE 10% margin x 1.5 turnover x 2 multiplier = 30%", () => {
  assert.ok(Math.abs(roe.calcDupontROE(10, 1.5, 2) - 30) < 0.01);
});

test("roe: calcEquityMultiplier 5M assets / 2.5M equity = 2", () => {
  assert.ok(Math.abs(roe.calcEquityMultiplier(5000000, 2500000) - 2) < 0.01);
});

test("roe: calcRetainedEarningsGrowth 20% ROE, 0% payout = 20% growth", () => {
  assert.ok(Math.abs(roe.calcRetainedEarningsGrowth(20, 0) - 20) < 0.01);
});

test("roe: roeLabel returns warning for low ROE", () => {
  const label = roe.roeLabel(3);
  assert.equal(label.type, "warning");
  assert.match(label.text, /low/i);
});

// ── WACC Calculator ─────────────────────────────────────────────────────────
const wacc = require("../static/js/tools/wacc-calculator.js");

test("wacc: 100M equity, 40M debt, 12% Re, 6% Rd, 21% tax → ~9.72%", () => {
  const total = 140000000;
  const expected = (100/140)*12 + (40/140)*6*(1-0.21);
  assert.ok(Math.abs(wacc.calcWACC(100000000, 40000000, 12, 6, 21) - expected) < 0.001);
});

test("wacc: equity weight 100M / 140M total ≈ 71.43%", () => {
  assert.ok(Math.abs(wacc.calcEquityWeight(100000000, 40000000) - 71.4286) < 0.01);
});

test("wacc: after-tax debt 6% at 21% tax = 4.74%", () => {
  assert.ok(Math.abs(wacc.calcAfterTaxDebt(6, 21) - 4.74) < 0.01);
});

test("wacc: waccLabel returns warning for high wacc", () => {
  const label = wacc.waccLabel(18);
  assert.equal(label.type, "danger");
});

// ── Employee Turnover Cost Calculator ───────────────────────────────────────
const etc = require("../static/js/tools/employee-turnover-cost-calculator.js");

test("etc: cost per exit for $75k salary > 0", () => {
  const cost = etc.calcTurnoverCostPerExit(75000, 42, null);
  assert.ok(cost > 0);
});

test("etc: 50 headcount × 15% turnover × $37.5k per exit = $281.25k annual", () => {
  const costPerExit = etc.calcTurnoverCostPerExit(75000, 42, null);
  const annual = etc.calcAnnualTurnoverCost(costPerExit, 50, 15);
  assert.ok(annual > 0 && annual < 2000000);
});

test("etc: turnoverLabel returns warning for 120% of salary", () => {
  const label = etc.turnoverLabel(120);
  assert.equal(label.type, "warning");
});

test("etc: turnoverLabel returns danger for 200% of salary", () => {
  const label = etc.turnoverLabel(200);
  assert.equal(label.type, "danger");
});

// ── IRR Calculator ────────────────────────────────────────────────────────────
const irr = require("../static/js/tools/irr-calculator.js");

test("irr: [-100000, 30000, 35000, 40000, 40000] IRR > 0", () => {
  const result = irr.calcIRR([-100000, 30000, 35000, 40000, 40000]);
  assert.ok(result !== null && result > 0);
});

test("irr: npv at 10% for [-100, 60, 60] is positive", () => {
  const npv = irr.calcNPVAtRate([-100, 60, 60], 10);
  assert.ok(npv > 0);
});

test("irr: no positive cashflow returns null", () => {
  assert.strictEqual(irr.calcIRR([-100, -50, -20]), null);
});

test("irr: irrLabel danger for negative irr", () => {
  const label = irr.irrLabel(-5, null);
  assert.equal(label.type, "danger");
});

// ── Payroll Tax Calculator ───────────────────────────────────────────────────
const ptax = require("../static/js/tools/payroll-tax-calculator.js");

test("pt: SS on $75k = 6.2% × $75k = $4,650", () => {
  assert.ok(Math.abs(ptax.calcSocialSecurity(75000) - 4650) < 0.01);
});

test("pt: SS capped at SS_WAGE_BASE", () => {
  assert.ok(Math.abs(ptax.calcSocialSecurity(200000) - 200000 * 0.062) > 1);
  assert.ok(Math.abs(ptax.calcSocialSecurity(200000) - 160200 * 0.062) < 0.01);
});

test("pt: Medicare 1.45% uncapped on $200k", () => {
  assert.ok(Math.abs(ptax.calcMedicare(200000) - 2900) < 0.01);
});

test("pt: FUTA capped at $7000 × 0.6% = $42", () => {
  assert.ok(Math.abs(ptax.calcFUTA(100000) - 42) < 0.01);
});

// ── Weighted Average Calculator ──────────────────────────────────────────────
const wa = require("../static/js/tools/weighted-average-calculator.js");

test("wa: [100 × 0.5 + 80 × 0.5] = 90", () => {
  const result = wa.calcWeightedAverage([{value:100,weight:0.5},{value:80,weight:0.5}]);
  assert.ok(Math.abs(result - 90) < 0.001);
});

test("wa: all zero weights returns null", () => {
  assert.strictEqual(wa.calcWeightedAverage([{value:10,weight:0},{value:20,weight:0}]), null);
});

test("wa: contributions sum to 100%", () => {
  const items = [{value:10,weight:30},{value:20,weight:70}];
  const contribs = wa.calcContributions(items);
  const sum = contribs.reduce(function(a,b){return a+b;},0);
  assert.ok(Math.abs(sum - 100) < 0.001);
});

// ── Gross Profit Margin Calculator ──────────────────────────────────────────
const gpm = require("../static/js/tools/gross-profit-margin-calculator.js");

test("gpm: gross profit = revenue - cogs", () => {
  assert.strictEqual(gpm.calcGrossProfit(500000, 150000), 350000);
});

test("gpm: gross margin = 350k/500k = 70%", () => {
  assert.ok(Math.abs(gpm.calcGrossMargin(500000, 150000) - 70) < 0.001);
});

test("gpm: markup = 350k/150k = 233.33%", () => {
  assert.ok(Math.abs(gpm.calcMarkup(500000, 150000) - (350000/150000*100)) < 0.001);
});

test("gpm: grossMarginLabel returns success for 70%", () => {
  const lbl = gpm.grossMarginLabel(70);
  assert.strictEqual(lbl.type, "success");
});

test("gpm: grossMarginLabel returns danger for negative margin", () => {
  assert.strictEqual(gpm.grossMarginLabel(-5).type, "danger");
});

// ── MIRR Calculator ──────────────────────────────────────────────────────────
const mirr = require("../static/js/tools/mirr-calculator.js");

test("mirr: positive MIRR for profitable project", () => {
  const cfs = [-100000, 25000, 30000, 35000, 40000];
  const result = mirr.calcMIRR(cfs, 10, 8);
  assert.ok(result !== null && result > 0);
});

test("mirr: null for empty cashflows", () => {
  assert.strictEqual(mirr.calcMIRR([], 10, 8), null);
});

test("mirr: mirrLabel success when MIRR > hurdle", () => {
  const lbl = mirr.mirrLabel(20, 15);
  assert.strictEqual(lbl.type, "success");
});

test("mirr: mirrLabel danger when MIRR < hurdle", () => {
  const lbl = mirr.mirrLabel(10, 15);
  assert.strictEqual(lbl.type, "danger");
});

// ── Cash Burn by Department ──────────────────────────────────────────────────
const burn = require("../static/js/tools/cash-burn-by-department.js");

test("burn: gross burn = sum of dept costs", () => {
  const depts = [{id:"eng",cost:120000},{id:"sales",cost:60000},{id:"mkt",cost:40000},{id:"ga",cost:30000}];
  assert.strictEqual(burn.calcDeptBurn(depts), 250000);
});

test("burn: net burn = gross - revenue", () => {
  assert.strictEqual(burn.calcNetBurn(250000, 50000), 200000);
});

test("burn: runway = cash / net burn", () => {
  assert.ok(Math.abs(burn.calcRunway(2000000, 200000) - 10) < 0.001);
});

test("burn: dept shares sum to 100%", () => {
  const depts = [{cost:120000},{cost:60000},{cost:40000},{cost:30000}];
  const shares = burn.calcDeptShares(depts);
  const sum = shares.reduce(function(a,b){return a+b;},0);
  assert.ok(Math.abs(sum - 100) < 0.001);
});

test("burn: burnLabel danger for < 3 months runway", () => {
  assert.strictEqual(burn.burnLabel(2).type, "danger");
});

// ── DCF Calculator ───────────────────────────────────────────────────────────
const dcf = require("../static/js/tools/dcf-calculator.js");

test("dcf: PV of [500k, 500k] at 10% = ~867k", () => {
  const pv = dcf.calcPVCashFlows([500000, 500000], 10);
  assert.ok(Math.abs(pv - (500000/1.1 + 500000/1.21)) < 1);
});

test("dcf: terminal value at 10% rate 3% growth = 15.3× last CF", () => {
  const tv = dcf.calcTerminalValue(1000000, 10, 3);
  assert.ok(Math.abs(tv - (1000000 * 1.03 / 0.07)) < 1);
});

test("dcf: terminal value null when growth >= discount rate", () => {
  assert.strictEqual(dcf.calcTerminalValue(1000000, 5, 5), null);
});

test("dcf: enterprise value = pvCF + pvTV", () => {
  const ev = dcf.calcEnterpriseValue(800000, 2000000);
  assert.strictEqual(ev, 2800000);
});

test("dcf: dcfLabel danger when terminal value > discount rate", () => {
  assert.strictEqual(dcf.dcfLabel(null, null, null).type, "danger");
});

// ── Operating Leverage Calculator ────────────────────────────────────────────
const ol = require("../static/js/tools/operating-leverage-calculator.js");

test("ol: contribution margin = revenue - variable costs", () => {
  assert.strictEqual(ol.calcContributionMargin(2000000, 400000), 1600000);
});

test("ol: operating income = revenue - variable - fixed", () => {
  assert.strictEqual(ol.calcOperatingIncome(2000000, 400000, 1200000), 400000);
});

test("ol: DOL = CM / OI = 1600k / 400k = 4", () => {
  const dol = ol.calcDOL(2000000, 400000, 1200000);
  assert.ok(Math.abs(dol - 4) < 0.001);
});

test("ol: break-even revenue = FC / CM ratio", () => {
  const ber = ol.calcBreakEvenRevenue(400000, 2000000, 1200000);
  assert.ok(Math.abs(ber - 1500000) < 1);
});

test("ol: dolLabel returns warning for DOL >= 4", () => {
  assert.strictEqual(ol.dolLabel(4).type, "warning");
});

// ── NRR Calculator (additional) ──────────────────────────────────────────────

test("nrr: nrrLabel exceptional for 130%+", () => {
  assert.strictEqual(nrr.nrrLabel(135).type, "success");
});

test("nrr: nrrLabel danger for < 90%", () => {
  assert.strictEqual(nrr.nrrLabel(85).type, "danger");
});

// ── Rule of 72 Calculator ────────────────────────────────────────────────────
const r72 = require("../static/js/tools/rule-of-72-calculator.js");

test("r72: doubling time at 8% = 9 years", () => {
  assert.strictEqual(r72.calcDoublingTime(8), 9);
});

test("r72: doubling time at 12% = 6 years", () => {
  assert.strictEqual(r72.calcDoublingTime(12), 6);
});

test("r72: required rate for 9 years = 8%", () => {
  assert.strictEqual(r72.calcRuleOf72Rate(9), 8);
});

test("r72: exact doubling time at 100% ≈ 1 year", () => {
  const exact = r72.calcExactDoublingTime(100);
  assert.ok(Math.abs(exact - 1) < 0.001);
});

test("r72: future value at 8% doubles in 9 years", () => {
  const fv = r72.calcFutureValue(10000, 8, 9);
  assert.ok(Math.abs(fv - 10000 * Math.pow(1.08, 9)) < 0.01);
});

test("r72: returns null on zero rate", () => {
  assert.equal(r72.calcDoublingTime(0), null);
});

test("r72: ro72Label success for doubling in 9 years", () => {
  assert.strictEqual(r72.ro72Label(9).type, "success");
});

test("r72: ro72Label danger for doubling in 36 years", () => {
  assert.strictEqual(r72.ro72Label(36).type, "danger");
});

// ── CAC Payback Period Calculator ────────────────────────────────────────────
const cpp = require("../static/js/tools/cac-payback-calculator.js");

test("cpp: payback period = CAC / (ARPU * margin)", () => {
  const months = cpp.calcPaybackMonths(1200, 150, 75);
  const expected = 1200 / (150 * 0.75);
  assert.ok(Math.abs(months - expected) < 0.001);
});

test("cpp: returns null when ARPU is 0", () => {
  assert.equal(cpp.calcPaybackMonths(1200, 0, 75), null);
});

test("cpp: returns null when margin is 0", () => {
  assert.equal(cpp.calcPaybackMonths(1200, 150, 0), null);
});

test("cpp: monthly gross profit = ARPU * margin / 100", () => {
  assert.strictEqual(cpp.calcMonthlyGrossProfit(150, 75), 112.5);
});

test("cpp: paybackLabel success for <= 12 months", () => {
  const months = cpp.calcPaybackMonths(1200, 150, 75);
  assert.ok(months <= 12);
  assert.strictEqual(cpp.paybackLabel(months).type, "success");
});

test("cpp: paybackLabel danger for > 24 months", () => {
  assert.strictEqual(cpp.paybackLabel(30).type, "danger");
});

// ── Sales Funnel Calculator ──────────────────────────────────────────────────
const sf = require("../static/js/tools/sales-funnel-calculator.js");

test("sf: calcFunnelStage basic", () => {
  assert.strictEqual(sf.calcFunnelStage(1000, 30), 300);
});

test("sf: calcFunnelStage zero rate returns 0", () => {
  assert.strictEqual(sf.calcFunnelStage(1000, 0), 0);
});

test("sf: calcFunnelOutput full pipeline", () => {
  const r = sf.calcFunnelOutput(1000, 30, 40, 50, 25, 500);
  assert.ok(r !== null);
  assert.strictEqual(r.mqls, 300);
  assert.strictEqual(r.sqls, 120);
  assert.strictEqual(r.opps, 60);
  assert.strictEqual(r.customers, 15);
  assert.strictEqual(r.mrr, 7500);
  assert.ok(Math.abs(r.overallConversion - 1.5) < 0.001);
});

test("sf: calcFunnelOutput returns null for zero leads", () => {
  assert.strictEqual(sf.calcFunnelOutput(0, 30, 40, 50, 25, 500), null);
});

test("sf: calcCostPerCustomer basic", () => {
  assert.strictEqual(sf.calcCostPerCustomer(15000, 15), 1000);
});

test("sf: calcCostPerCustomer returns null for zero customers", () => {
  assert.strictEqual(sf.calcCostPerCustomer(15000, 0), null);
});

test("sf: calcLeadsRequired basic", () => {
  const leads = sf.calcLeadsRequired(15, 30, 40, 50, 25);
  assert.ok(Math.abs(leads - 1000) < 0.01);
});

test("sf: funnelEfficiencyLabel excellent above 5%", () => {
  assert.strictEqual(sf.funnelEfficiencyLabel(6), "Excellent");
});

test("sf: funnelEfficiencyLabel needs work below 0.5%", () => {
  assert.strictEqual(sf.funnelEfficiencyLabel(0.3), "Needs work");
});

// ── DSCR Calculator ─────────────────────────────────────────────────────────
const dscr = require("../static/js/tools/dscr-calculator.js");

test("dscr: calcDSCR basic", () => {
  assert.ok(Math.abs(dscr.calcDSCR(500000, 300000) - (5/3)) < 0.001);
});

test("dscr: calcDSCR returns null for zero debt service", () => {
  assert.strictEqual(dscr.calcDSCR(500000, 0), null);
});

test("dscr: calcMaxDebtService basic", () => {
  assert.ok(Math.abs(dscr.calcMaxDebtService(500000, 1.25) - 400000) < 0.01);
});

test("dscr: calcMaxDebtService returns null for zero minDscr", () => {
  assert.strictEqual(dscr.calcMaxDebtService(500000, 0), null);
});

test("dscr: calcAnnualDebtService basic amortization", () => {
  const ads = dscr.calcAnnualDebtService(250000, 7.5, 60);
  assert.ok(ads > 50000 && ads < 75000);
});

test("dscr: calcAnnualDebtService returns null for zero principal", () => {
  assert.strictEqual(dscr.calcAnnualDebtService(0, 7.5, 60), null);
});

test("dscr: dscrLabel strong", () => {
  assert.strictEqual(dscr.dscrLabel(1.8), "Strong");
});

test("dscr: dscrLabel below coverage", () => {
  assert.strictEqual(dscr.dscrLabel(0.9), "Below Coverage");
});

// ── EBITDA Multiple Calculator ──────────────────────────────────────────────
const em = require("../static/js/tools/ebitda-multiple-calculator.js");

test("em: calcEVFromEBITDA basic", () => {
  assert.strictEqual(em.calcEVFromEBITDA(2000000, 10), 20000000);
});

test("em: calcEVFromEBITDA returns null for zero EBITDA", () => {
  assert.strictEqual(em.calcEVFromEBITDA(0, 10), null);
});

test("em: calcEVFromRevenue basic", () => {
  assert.strictEqual(em.calcEVFromRevenue(10000000, 3), 30000000);
});

test("em: calcEquityValue basic", () => {
  assert.strictEqual(em.calcEquityValue(20000000, 1000000, 500000), 19500000);
});

test("em: calcImpliedMultiple basic", () => {
  assert.strictEqual(em.calcImpliedMultiple(20000000, 2000000), 10);
});

test("em: calcEBITDAMargin basic", () => {
  assert.strictEqual(em.calcEBITDAMargin(2000000, 10000000), 20);
});

test("em: multipleLabel high-growth premium", () => {
  assert.strictEqual(em.multipleLabel(25), "High-growth premium");
});

test("em: multipleLabel market range", () => {
  assert.strictEqual(em.multipleLabel(7), "Market range");
});

// ── Current Ratio Calculator ─────────────────────────────────────────────────
const liq = require("../static/js/tools/current-ratio-calculator.js");

test("liq: calcCurrentRatio basic", () => {
  assert.strictEqual(liq.calcCurrentRatio(500000, 250000), 2.0);
});

test("liq: calcCurrentRatio returns null for zero liabilities", () => {
  assert.strictEqual(liq.calcCurrentRatio(500000, 0), null);
});

test("liq: calcQuickRatio excludes inventory", () => {
  assert.strictEqual(liq.calcQuickRatio(500000, 80000, 250000), (500000 - 80000) / 250000);
});

test("liq: calcCashRatio basic", () => {
  assert.strictEqual(liq.calcCashRatio(120000, 250000), 0.48);
});

test("liq: calcNetWorkingCapital basic", () => {
  assert.strictEqual(liq.calcNetWorkingCapital(500000, 250000), 250000);
});

test("liq: currentRatioLabel strong", () => {
  assert.strictEqual(liq.currentRatioLabel(2.5), "Strong");
});

test("liq: currentRatioLabel liquidity risk", () => {
  assert.strictEqual(liq.currentRatioLabel(0.8), "Liquidity Risk");
});

// ── Markup Calculator ────────────────────────────────────────────────────────
const mk = require("../static/js/tools/markup-calculator.js");

test("mk: calcMarkupPct basic", () => {
  assert.ok(Math.abs(mk.calcMarkupPct(40, 100) - 150) < 0.001);
});

test("mk: calcMarginPct basic", () => {
  assert.ok(Math.abs(mk.calcMarginPct(40, 100) - 60) < 0.001);
});

test("mk: calcMarkupPct returns null for zero cost", () => {
  assert.strictEqual(mk.calcMarkupPct(0, 100), null);
});

test("mk: calcSellingPriceFromMarkup 100% markup doubles cost", () => {
  assert.strictEqual(mk.calcSellingPriceFromMarkup(40, 100), 80);
});

test("mk: calcSellingPriceFromMargin 50% margin", () => {
  assert.strictEqual(mk.calcSellingPriceFromMargin(40, 50), 80);
});

test("mk: markup to margin conversion", () => {
  assert.ok(Math.abs(mk.calcMarginFromMarkup(100) - 50) < 0.001);
});

test("mk: margin to markup conversion", () => {
  assert.ok(Math.abs(mk.calcMarkupFromMargin(50) - 100) < 0.001);
});

// ── AOV Calculator ───────────────────────────────────────────────────────────
const aov = require("../static/js/tools/aov-calculator.js");

test("aov: calcAOV basic", () => {
  assert.strictEqual(aov.calcAOV(50000, 250), 200);
});

test("aov: calcAOV returns null for zero orders", () => {
  assert.strictEqual(aov.calcAOV(50000, 0), null);
});

test("aov: calcRevenueFromAOV basic", () => {
  assert.strictEqual(aov.calcRevenueFromAOV(200, 250), 50000);
});

test("aov: calcOrdersNeeded basic", () => {
  assert.strictEqual(aov.calcOrdersNeeded(100000, 200), 500);
});

test("aov: calcAOVImpact basic", () => {
  assert.strictEqual(aov.calcAOVImpact(200, 220, 250), 5000);
});

test("aov: calcRevenuePerVisitor basic", () => {
  assert.strictEqual(aov.calcRevenuePerVisitor(50000, 10000), 5);
});

test("aov: aovLabel high AOV", () => {
  assert.strictEqual(aov.aovLabel(600), "High AOV");
});

// ── Commission Calculator ────────────────────────────────────────────────────
const comm = require("../static/js/tools/commission-calculator.js");

test("comm: calcFlatCommission basic", () => {
  assert.strictEqual(comm.calcFlatCommission(150000, 8), 12000);
});

test("comm: calcFlatCommission returns null for negative revenue", () => {
  assert.strictEqual(comm.calcFlatCommission(-1000, 8), null);
});

test("comm: calcEffectiveRate basic", () => {
  assert.ok(Math.abs(comm.calcEffectiveRate(150000, 12000) - 8) < 0.001);
});

test("comm: calcOTEAttainment at 100% OTE", () => {
  assert.ok(Math.abs(comm.calcOTEAttainment(120000, 120000) - 100) < 0.001);
});

test("comm: commissionLabel quota achieved", () => {
  assert.strictEqual(comm.commissionLabel(105), "Quota achieved");
});

test("comm: commissionLabel below target", () => {
  assert.strictEqual(comm.commissionLabel(60), "Below target");
});

test("comm: calcTieredCommission single tier", () => {
  const tiers = [{ floor: 0, rate: 8 }];
  assert.strictEqual(comm.calcTieredCommission(100000, tiers), 8000);
});

// ── ROA Calculator ───────────────────────────────────────────────────────────
const roa = require("../static/js/tools/roa-calculator.js");

test("roa: calcROA basic", () => {
  assert.strictEqual(roa.calcROA(500000, 5000000), 10);
});

test("roa: calcROA returns null for zero assets", () => {
  assert.strictEqual(roa.calcROA(500000, 0), null);
});

test("roa: calcAssetTurnover basic", () => {
  assert.ok(Math.abs(roa.calcAssetTurnover(3000000, 5000000) - 0.6) < 0.001);
});

test("roa: calcNetProfitMargin basic", () => {
  assert.ok(Math.abs(roa.calcNetProfitMargin(500000, 3000000) - 16.667) < 0.01);
});

test("roa: roaLabel excellent above 10%", () => {
  assert.strictEqual(roa.roaLabel(12), "Excellent");
});

test("roa: roaLabel unprofitable for negative", () => {
  assert.strictEqual(roa.roaLabel(-2), "Unprofitable");
});

// ── Debt-to-Equity Calculator ────────────────────────────────────────────────
const dte = require("../static/js/tools/debt-to-equity-calculator.js");

test("dte: calcDebtToEquity basic", () => {
  assert.ok(Math.abs(dte.calcDebtToEquity(500000, 750000) - (2/3)) < 0.001);
});

test("dte: calcDebtToEquity returns null for zero equity", () => {
  assert.strictEqual(dte.calcDebtToEquity(500000, 0), null);
});

test("dte: calcEquityRatio basic", () => {
  assert.ok(Math.abs(dte.calcEquityRatio(750000, 1250000) - 60) < 0.001);
});

test("dte: calcDebtRatio basic", () => {
  assert.ok(Math.abs(dte.calcDebtRatio(500000, 1250000) - 40) < 0.001);
});

test("dte: debtToEquityLabel conservative", () => {
  assert.strictEqual(dte.debtToEquityLabel(0.3), "Conservative");
});

test("dte: debtToEquityLabel highly leveraged", () => {
  assert.strictEqual(dte.debtToEquityLabel(3.5), "Highly Leveraged");
});

// ── Customer Retention Rate Calculator ──────────────────────────────────────
const ret = require("../static/js/tools/customer-retention-rate-calculator.js");

test("ret: calcRetentionRate basic", () => {
  assert.ok(Math.abs(ret.calcRetentionRate(500, 490, 40) - 90) < 0.001);
});

test("ret: calcRetentionRate returns null for zero start", () => {
  assert.strictEqual(ret.calcRetentionRate(0, 490, 40), null);
});

test("ret: calcChurnRate basic", () => {
  assert.ok(Math.abs(ret.calcChurnRate(90) - 10) < 0.001);
});

test("ret: calcImpliedLTV basic", () => {
  assert.strictEqual(ret.calcImpliedLTV(99, 10), 990);
});

test("ret: retentionLabel excellent", () => {
  assert.strictEqual(ret.retentionLabel(97), "Excellent");
});

test("ret: retentionLabel high churn", () => {
  assert.strictEqual(ret.retentionLabel(75), "High churn");
});

// ── Percentage Change Calculator ─────────────────────────────────────────────
const pct = require("../static/js/tools/percentage-change-calculator.js");

test("pct: calcPercentageChange increase", () => {
  assert.ok(Math.abs(pct.calcPercentageChange(800000, 1000000) - 25) < 0.001);
});

test("pct: calcPercentageChange decrease", () => {
  assert.ok(Math.abs(pct.calcPercentageChange(50000, 38000) - (-24)) < 0.001);
});

test("pct: calcPercentageChange returns null for zero old", () => {
  assert.strictEqual(pct.calcPercentageChange(0, 100), null);
});

test("pct: calcAbsoluteChange basic", () => {
  assert.strictEqual(pct.calcAbsoluteChange(800000, 1000000), 200000);
});

test("pct: calcCAGR basic", () => {
  const cagr = pct.calcCAGR(1000000, 4000000, 3);
  assert.ok(Math.abs(cagr - 58.74) < 0.1);
});

test("pct: calcNewValueFromChange basic", () => {
  assert.strictEqual(pct.calcNewValueFromChange(100, 25), 125);
});

// ── COGS Calculator ──────────────────────────────────────────────────────────
const cogs = require("../static/js/tools/cogs-calculator.js");

test("cogs: calcCOGS basic", () => {
  assert.strictEqual(cogs.calcCOGS(150000, 900000, 180000), 870000);
});

test("cogs: calcGrossProfit basic", () => {
  assert.strictEqual(cogs.calcGrossProfit(1500000, 870000), 630000);
});

test("cogs: calcGrossMarginPct basic", () => {
  assert.ok(Math.abs(cogs.calcGrossMarginPct(1500000, 870000) - 42) < 0.001);
});

test("cogs: calcGrossMarginPct returns null for zero revenue", () => {
  assert.strictEqual(cogs.calcGrossMarginPct(0, 870000), null);
});

test("cogs: calcAvgInventory basic", () => {
  assert.strictEqual(cogs.calcAvgInventory(150000, 180000), 165000);
});

test("cogs: cogsLabel high margin", () => {
  assert.strictEqual(cogs.cogsLabel(65), "High margin");
});

// ── Net Profit Calculator ────────────────────────────────────────────────────
const np = require("../static/js/tools/net-profit-calculator.js");

test("np: calcGrossProfit basic", () => {
  assert.strictEqual(np.calcGrossProfit(1000000, 400000), 600000);
});

test("np: calcOperatingIncome basic", () => {
  assert.strictEqual(np.calcOperatingIncome(600000, 250000), 350000);
});

test("np: calcNetProfit basic", () => {
  assert.strictEqual(np.calcNetProfit(350000, 20000, 82500), 247500);
});

test("np: calcNetProfitMargin basic", () => {
  assert.ok(Math.abs(np.calcNetProfitMargin(247500, 1000000) - 24.75) < 0.001);
});

test("np: calcNetProfitMargin returns null for zero revenue", () => {
  assert.strictEqual(np.calcNetProfitMargin(100, 0), null);
});

test("np: calcGrossMargin basic", () => {
  assert.ok(Math.abs(np.calcGrossMargin(600000, 1000000) - 60) < 0.001);
});

test("np: calcOperatingMargin basic", () => {
  assert.ok(Math.abs(np.calcOperatingMargin(350000, 1000000) - 35) < 0.001);
});

test("np: profitLabel highly profitable", () => {
  assert.strictEqual(np.profitLabel(25), "Highly profitable");
});

test("np: profitLabel profitable", () => {
  assert.strictEqual(np.profitLabel(12), "Profitable");
});

test("np: profitLabel breakeven", () => {
  assert.strictEqual(np.profitLabel(0), "Breakeven zone");
});

test("np: profitLabel net loss", () => {
  assert.strictEqual(np.profitLabel(-5), "Net loss");
});

// ── Financial Ratios Calculator ──────────────────────────────────────────────
const frat = require("../static/js/tools/financial-ratios-calculator.js");

test("frat: calcCurrentRatio basic", () => {
  assert.ok(Math.abs(frat.calcCurrentRatio(1800000, 900000) - 2) < 0.001);
});

test("frat: calcCurrentRatio returns null for zero liabilities", () => {
  assert.strictEqual(frat.calcCurrentRatio(1000, 0), null);
});

test("frat: calcDebtToEquity basic", () => {
  assert.ok(Math.abs(frat.calcDebtToEquity(2000000, 3000000) - 0.6667) < 0.001);
});

test("frat: calcDebtToEquity returns null for zero equity", () => {
  assert.strictEqual(frat.calcDebtToEquity(1000, 0), null);
});

test("frat: calcROE basic", () => {
  assert.ok(Math.abs(frat.calcROE(600000, 3000000) - 20) < 0.001);
});

test("frat: calcROA basic", () => {
  assert.ok(Math.abs(frat.calcROA(600000, 8000000) - 7.5) < 0.001);
});

test("frat: calcGrossMargin basic", () => {
  assert.ok(Math.abs(frat.calcGrossMargin(5000000, 2000000) - 60) < 0.001);
});

test("frat: calcNetMargin basic", () => {
  assert.ok(Math.abs(frat.calcNetMargin(600000, 5000000) - 12) < 0.001);
});

test("frat: calcROA returns null for zero assets", () => {
  assert.strictEqual(frat.calcROA(100, 0), null);
});

// ── Times Interest Earned Calculator ────────────────────────────────────────
const tie = require("../static/js/tools/times-interest-earned-calculator.js");

test("tie: calcTIE basic", () => {
  assert.ok(Math.abs(tie.calcTIE(500000, 100000) - 5) < 0.001);
});

test("tie: calcTIE returns null for zero interest", () => {
  assert.strictEqual(tie.calcTIE(500000, 0), null);
});

test("tie: calcEBIT basic", () => {
  assert.strictEqual(tie.calcEBIT(2000000, 800000, 700000), 500000);
});

test("tie: calcInterestCoverageBuffer basic", () => {
  assert.ok(Math.abs(tie.calcInterestCoverageBuffer(5) - 80) < 0.001);
});

test("tie: tieLabel strong", () => {
  assert.strictEqual(tie.tieLabel(6), "Strong coverage");
});

test("tie: tieLabel adequate", () => {
  assert.strictEqual(tie.tieLabel(4), "Adequate coverage");
});

test("tie: tieLabel tight", () => {
  assert.strictEqual(tie.tieLabel(2), "Tight coverage");
});

test("tie: tieLabel cannot cover", () => {
  assert.strictEqual(tie.tieLabel(0.8), "Cannot cover interest");
});

// ── P/E Ratio Calculator ─────────────────────────────────────────────────────
const per = require("../static/js/tools/pe-ratio-calculator.js");

test("per: calcPE basic", () => {
  assert.ok(Math.abs(per.calcPE(150, 7.5) - 20) < 0.001);
});

test("per: calcPE returns null for zero EPS", () => {
  assert.strictEqual(per.calcPE(100, 0), null);
});

test("per: calcImpliedStockPrice basic", () => {
  assert.strictEqual(per.calcImpliedStockPrice(7.5, 20), 150);
});

test("per: calcEarningsYield basic", () => {
  assert.ok(Math.abs(per.calcEarningsYield(20) - 5) < 0.001);
});

test("per: calcForwardPE basic", () => {
  assert.ok(Math.abs(per.calcForwardPE(150, 9) - 16.667) < 0.01);
});

test("per: calcPEGRatio basic", () => {
  assert.ok(Math.abs(per.calcPEGRatio(20, 15) - 1.333) < 0.01);
});

test("per: peLabel value territory", () => {
  assert.strictEqual(per.peLabel(8), "Value territory");
});

test("per: peLabel growth premium", () => {
  assert.strictEqual(per.peLabel(28), "Growth premium");
});

// ── Revenue Growth Rate Calculator ──────────────────────────────────────────
const rgr = require("../static/js/tools/revenue-growth-rate-calculator.js");

test("rgr: calcGrowthRate basic", () => {
  assert.ok(Math.abs(rgr.calcGrowthRate(800000, 1000000) - 25) < 0.001);
});

test("rgr: calcGrowthRate returns null for zero previous", () => {
  assert.strictEqual(rgr.calcGrowthRate(0, 100), null);
});

test("rgr: calcCAGR basic", () => {
  assert.ok(Math.abs(rgr.calcCAGR(1000000, 1728000, 3) - 20) < 0.01);
});

test("rgr: calcRuleOf40 basic", () => {
  assert.strictEqual(rgr.calcRuleOf40(25, 15), 40);
});

test("rgr: growthLabel hypergrowth", () => {
  assert.strictEqual(rgr.growthLabel(120), "Hypergrowth");
});

test("rgr: growthLabel declining", () => {
  assert.strictEqual(rgr.growthLabel(-10), "Declining");
});

// ── Enterprise Value Calculator ──────────────────────────────────────────────
const evCalc = require("../static/js/tools/enterprise-value-calculator.js");

test("evCalc: calcEnterpriseValue basic", () => {
  assert.strictEqual(evCalc.calcEnterpriseValue(500000000, 80000000, 30000000), 550000000);
});

test("evCalc: calcMarketCap basic", () => {
  assert.strictEqual(evCalc.calcMarketCap(10000000, 50), 500000000);
});

test("evCalc: calcEVToEBITDA basic", () => {
  assert.ok(Math.abs(evCalc.calcEVToEBITDA(550000000, 50000000) - 11) < 0.001);
});

test("evCalc: calcEVToEBITDA returns null for zero EBITDA", () => {
  assert.strictEqual(evCalc.calcEVToEBITDA(100, 0), null);
});

test("evCalc: calcEVToRevenue basic", () => {
  assert.ok(Math.abs(evCalc.calcEVToRevenue(550000000, 200000000) - 2.75) < 0.001);
});

test("evCalc: evLabel below market", () => {
  assert.strictEqual(evCalc.evLabel(8), "Below market");
});

test("evCalc: evLabel market range", () => {
  assert.strictEqual(evCalc.evLabel(12), "Market range");
});

// ── Invoice Discount Calculator ──────────────────────────────────────────────
const idc = require("../static/js/tools/invoice-discount-calculator.js");

test("idc: calcEarlyPaymentDiscount basic", () => {
  assert.ok(Math.abs(idc.calcEarlyPaymentDiscount(10000, 2) - 200) < 0.001);
});

test("idc: calcNetPayment basic", () => {
  assert.ok(Math.abs(idc.calcNetPayment(10000, 2) - 9800) < 0.001);
});

test("idc: calcAnnualizedCostOfCredit 2-10-net-30", () => {
  assert.ok(Math.abs(idc.calcAnnualizedCostOfCredit(2, 10, 30) - 37.24) < 0.1);
});

test("idc: calcAnnualizedCostOfCredit returns null for zero days gained", () => {
  assert.strictEqual(idc.calcAnnualizedCostOfCredit(2, 30, 30), null);
});

test("idc: discountCostLabel cheap", () => {
  assert.strictEqual(idc.discountCostLabel(4), "Cheap financing");
});

test("idc: discountCostLabel very expensive", () => {
  assert.strictEqual(idc.discountCostLabel(40), "Very expensive — equivalent to high-interest debt");
});

// ── Price Per Unit Calculator ────────────────────────────────────────────────
const ppu = require("../static/js/tools/price-per-unit-calculator.js");

test("ppu: calcPricePerUnit basic", () => {
  assert.ok(Math.abs(ppu.calcPricePerUnit(12.99, 16) - 0.8119) < 0.001);
});

test("ppu: calcPricePerUnit returns null for zero quantity", () => {
  assert.strictEqual(ppu.calcPricePerUnit(10, 0), null);
});

test("ppu: calcTotalCost basic", () => {
  assert.ok(Math.abs(ppu.calcTotalCost(0.8119, 16) - 12.99) < 0.01);
});

test("ppu: calcSavingsPct basic", () => {
  assert.ok(Math.abs(ppu.calcSavingsPct(0.8119, 0.733) - 9.71) < 0.1);
});

test("ppu: calcUnitsNeeded basic", () => {
  assert.strictEqual(ppu.calcUnitsNeeded(100, 3.5), 28);
});
