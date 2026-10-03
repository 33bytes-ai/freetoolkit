"""The X post gate: every way a drafted post must be refused."""
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "social"))
import gate  # noqa: E402

TOOL = next(t for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())
            if t["slug"] == "stripe-fee-calculator")
BASE = "https://foundercalc.dev"


def post(**over):
    base = {"tool": TOOL["slug"], "date": "2026-10-10",
            "hook": "Stripe takes more than 2.9% of a $100 sale.",
            "value": "On $100 the fee is $3.20, so you keep $96.80.",
            "cta_text": "Try your own amount.",
            "computation": {"fn": "calculateFee", "args": [100, 0.029, 0.30]}}
    return {**base, **over}


def check(p, history=(), affiliate=False):
    return gate.check(p, TOOL, list(history), base_url=BASE, affiliate_page=affiliate,
                      today=date(2026, 10, 10))


def test_a_correct_post_passes():
    assert check(post()) == []


def test_a_wrong_number_is_refused():
    problems = check(post(value="On $100 the fee is $3.90, so you keep $96.10."))
    assert any("3.9" in p for p in problems)


def test_a_post_over_280_characters_is_refused():
    assert any("max 280" in p for p in check(post(value="On $100 the fee is $3.20. " * 12)))


def test_an_unknown_function_is_refused():
    p = post(computation={"fn": "nope", "args": []})
    assert any("computation failed" in x for x in check(p))


def test_a_repeated_hook_is_refused():
    old = post(date="2026-09-01", tool="other-tool")
    assert "hook already used" in check(post(), [old])


def test_a_recently_covered_tool_is_refused():
    old = post(date="2026-10-01", hook="Something else entirely.")
    assert any("was posted on 2026-10-01" in p for p in check(post(), [old]))


def test_an_affiliate_page_needs_a_disclosure_in_the_cta():
    assert any("affiliate" in p for p in check(post(), affiliate=True))
    assert check(post(cta_text="Try it (page has affiliate links)."), affiliate=True) == []


def test_the_link_is_tracked():
    assert gate.utm_link(BASE, post()) == (
        "https://foundercalc.dev/tools/stripe-fee-calculator/?utm_source=x&utm_medium=social"
        "&utm_campaign=2026-10-10-stripe-fee-calculator")
