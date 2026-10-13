---
title: How to Choose the Right Discount Rate for NPV Calculations
slug: tools/npv-calculator/how-to-choose-discount-rate
description: "The discount rate is the most important input in NPV analysis. Learn how to calculate WACC, hurdle rates, and opportunity cost \u2014 and why the wrong rate leads to bad decisions."
---

The discount rate is the single most critical input in NPV analysis. Choose too low
and you'll accept bad investments. Choose too high and you'll reject good ones.

## The concept: opportunity cost of capital

The discount rate represents what you could earn by investing money elsewhere
at similar risk. If you can earn 10% in the stock market at similar risk, any
project that doesn't earn at least 10% destroys value relative to the alternative.

**Key principle**: the discount rate should reflect the risk of the project,
not the risk of the investor or the company's average projects.

## Method 1: WACC (Weighted Average Cost of Capital)

For businesses with both debt and equity financing:

**WACC = (E/V × Re) + (D/V × Rd × (1 − Tax Rate))**

Where:
- E/V = equity weight (equity / total value)
- Re = cost of equity (e.g., 12–15% for a small business)
- D/V = debt weight
- Rd = cost of debt (interest rate on loans)
- Tax rate = corporate tax rate (interest is tax-deductible)

**Example**: 60% equity at 14% cost + 40% debt at 8% at 25% tax rate:
WACC = (0.60 × 14%) + (0.40 × 8% × 0.75) = 8.4% + 2.4% = **10.8%**

## Method 2: Hurdle rate

Many companies set a minimum acceptable IRR for projects (the "hurdle rate").
This is a policy decision, not a formula. Common hurdle rates:
- Large corporates: 12–15%
- Mid-market companies: 15–20%
- Startups and high-risk projects: 20–30%
- Venture capital: 30–40%

## Method 3: Risk-adjusted rate

For projects with different risk profiles from your core business:
- Low risk (cost savings, operational improvements): WACC − 2–3%
- Average risk (core business expansion): WACC
- High risk (new markets, unproven technology): WACC + 5–10%
- Speculative (moonshot projects): 25–40%

## Common mistakes

**Using the cost of debt only**: "Our loan rate is 7%, so we use 7%." Wrong —
this ignores the cost of equity, which is significantly higher than debt.

**Using a fixed rate for all projects**: A stable manufacturing investment is not
the same risk as a software startup. Same company, different risk, different rate.

**Using the nominal rate for real cash flows**: If cash flows are in inflation-
adjusted (real) terms, use a real discount rate. If nominal, use nominal.

For most business decisions, start with WACC and adjust up for higher-risk projects.
If uncertain, run sensitivity analysis: calculate NPV at 8%, 12%, 16%, and 20%.

Use the [NPV Calculator](/tools/npv-calculator/) to model different discount rate scenarios.

## Run the numbers

Put your rate to work in the [NPV Calculator](/tools/npv-calculator/), then compare it against a sensitivity range of 8%, 12%, 16% and 20%. If you model the result in a tool built for scenarios, [Causal](/go/npv-calculator/causal/) is one option. If you publish calculators on your own site, [FounderCalc Pro](/pro/) removes the credit line from the embed.
