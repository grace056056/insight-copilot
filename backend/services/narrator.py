"""
services/narrator.py
--------------------
Converts deterministic Evidence objects into human-readable Insight objects.

This is the final stage of the analysis pipeline:

  CSV → Profiler → Semantic Classifier → Analysis Templates → NARRATOR
                                                                  ↑ you are here

The narrator's job is purely narrative. It receives pre-computed evidence
(with exact numbers from pandas) and writes business insights that:
  1. State a finding using ONLY the numbers in the evidence
  2. Explain the business significance
  3. Recommend an action

The narrator NEVER computes, rounds, or invents numbers. This is the
core reliability guarantee of the system.

Two modes:
  - Claude mode: sends evidence to Claude API for rich, contextual narratives
  - Mock mode: generates template-based insights deterministically

Interview talking point:
  "The narrator receives pre-computed evidence and writes narratives.
  It cannot hallucinate numbers because every number comes from a pandas
  computation in the evidence layer. The LLM's role is narrowed to what
  it excels at — understanding business context and writing clearly —
  while numerical accuracy is guaranteed by code."
"""

from __future__ import annotations

import asyncio
import json
import logging

from models.schemas import ChartType, Evidence, Insight, Priority
from config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_insights(
    evidence_results: list[dict],
) -> list[Insight]:
    """
    Generate business insights from computed evidence.

    Args:
        evidence_results: Output from registry.run_all(). Each dict contains:
            - "template": str (template name)
            - "display_name": str
            - "evidence": Evidence object

    Returns:
        List of Insight objects, each linked to its source evidence.
    """
    if not evidence_results:
        return []

    if settings.ANTHROPIC_API_KEY:
        narratives = await _claude_narrate(evidence_results)
    else:
        logger.info("Using mock narrator (no API key set)")
        narratives = _mock_narrate(evidence_results)

    # Build Insight objects by merging narratives with evidence
    insights = []
    for i, narrative in enumerate(narratives):
        # Find the matching evidence
        template_name = narrative["template_used"]
        evidence_match = next(
            (r for r in evidence_results if r["template"] == template_name),
            None,
        )
        if not evidence_match:
            continue

        insight = Insight(
            id=f"ins_{i + 1:03d}",
            text=narrative["text"],
            priority=Priority(narrative["priority"]),
            confidence=narrative.get("confidence", 0.85),
            category=template_name,
            recommendation=narrative["recommendation"],
            evidence=evidence_match["evidence"],
            feedback=None,
        )
        insights.append(insight)

    # Sort by priority: high first, then medium, then low
    priority_order = {Priority.HIGH: 0, Priority.MEDIUM: 1, Priority.LOW: 2}
    insights.sort(key=lambda x: priority_order.get(x.priority, 99))

    logger.info("Generated %d insights (%d high, %d medium, %d low)",
        len(insights),
        sum(1 for i in insights if i.priority == Priority.HIGH),
        sum(1 for i in insights if i.priority == Priority.MEDIUM),
        sum(1 for i in insights if i.priority == Priority.LOW),
    )

    return insights


# ---------------------------------------------------------------------------
# Claude narrator (production mode)
# ---------------------------------------------------------------------------

async def _claude_narrate(evidence_results: list[dict]) -> list[dict]:
    """
    Use Claude to write the narratives, then check its numbers.

    The prompt tells Claude to use only the numbers in the evidence, but a
    prompt is a request, not a guarantee. So after Claude answers, pandas'
    evidence gets the last word (the same check Pip's answers go through):

      1. Every number in an insight's text and recommendation must appear in
         that insight's own evidence.
      2. If some don't, Claude gets one chance to rewrite.
      3. Any insight that still fails is replaced by the deterministic
         template sentence for that analysis, so nothing unverified ships.

    Any failure at all (bad key, network, SDK error) falls back to the mock
    narrator. The Anthropic SDK is synchronous, so the call runs in a worker
    thread to keep the server responsive for other visitors.
    """
    try:
        return await asyncio.to_thread(_claude_narrate_checked, evidence_results)
    except Exception as e:
        logger.error("Claude narrator failed (%s) — falling back to mock narrator", e)
        return _mock_narrate(evidence_results)


NARRATOR_MAX_CALLS = 2


def _claude_narrate_checked(evidence_results: list[dict]) -> list[dict]:
    import anthropic
    from prompts.narrator_v1 import (
        SYSTEM_PROMPT,
        USER_PROMPT_TEMPLATE,
        CORRECTION_PROMPT,
        GROUNDING_CORRECTION_PROMPT,
        format_evidence_for_prompt,
    )

    evidence_blocks = "\n\n".join(
        format_evidence_for_prompt(r["template"], r["evidence"].model_dump())
        for r in evidence_results
    )
    messages = [{"role": "user", "content": USER_PROMPT_TEMPLATE.format(evidence_blocks=evidence_blocks)}]
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=60.0)

    narratives: list[dict] | None = None
    problems: dict[int, list[str]] = {}

    for attempt in range(NARRATOR_MAX_CALLS):
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        raw_text = "".join(b.text for b in response.content if b.type == "text")
        parsed = _parse_narrator_response(raw_text)

        if parsed is None:
            correction = CORRECTION_PROMPT.format(error="Response did not match expected schema")
        else:
            narratives = parsed
            problems = _ungrounded(narratives, evidence_results)
            if not problems:
                logger.info("Claude narrator passed the number check on call %d", attempt + 1)
                return narratives
            correction = GROUNDING_CORRECTION_PROMPT.format(problems="\n".join(
                f'- insight for "{narratives[i]["template_used"]}": {", ".join(nums)}'
                for i, nums in problems.items()
            ))
            logger.warning("Narrator numbers not in evidence: %s", problems)

        messages = messages[:1] + [
            {"role": "assistant", "content": raw_text or "(empty response)"},
            {"role": "user", "content": correction},
        ]

    if narratives is None:
        logger.warning("Claude narrator never produced valid JSON — using mock narrator")
        return _mock_narrate(evidence_results)

    # Replace only the insights that still carry unverified numbers.
    for i in problems:
        template_name = narratives[i]["template_used"]
        source = [r for r in evidence_results if r["template"] == template_name]
        replacement = _mock_narrate(source) if source else []
        logger.warning("Replacing %s insight with its template sentence", template_name)
        narratives[i] = replacement[0] if replacement else None
    return [n for n in narratives if n is not None]


def _ungrounded(narratives: list[dict], evidence_results: list[dict]) -> dict[int, list[str]]:
    """Map insight index -> numbers it states that its evidence does not contain."""
    from agent.grounding import collect_evidence_numbers, find_unverified

    by_template = {r["template"]: r["evidence"] for r in evidence_results}
    problems: dict[int, list[str]] = {}
    for i, n in enumerate(narratives):
        evidence = by_template.get(n["template_used"])
        if evidence is None:
            continue  # unknown template: generate_insights drops it anyway
        allowed = collect_evidence_numbers([evidence.model_dump()])
        bad = find_unverified(f'{n["text"]} {n["recommendation"]}', allowed)
        if bad:
            problems[i] = bad
    return problems


def _parse_narrator_response(raw_text: str) -> list[dict] | None:
    """
    Parse and validate the narrator's JSON response.

    Same defensive parsing as the semantic profiler — handles markdown
    fences, preamble text, and missing fields.
    """
    text = raw_text.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    # Try to parse JSON
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                data = json.loads(text[start:end])
            except json.JSONDecodeError:
                return None
        else:
            return None

    if not isinstance(data, dict) or "insights" not in data:
        return None

    insights = data["insights"]
    if not isinstance(insights, list) or len(insights) == 0:
        return None

    # Validate each insight has required fields
    valid_priorities = {"high", "medium", "low"}
    for ins in insights:
        if not isinstance(ins, dict):
            return None
        if "text" not in ins or "template_used" not in ins:
            return None
        # Normalize priority
        if ins.get("priority") not in valid_priorities:
            ins["priority"] = "medium"
        if not isinstance(ins["text"], str) or not isinstance(ins["template_used"], str):
            return None
        # Ensure recommendation exists
        if not isinstance(ins.get("recommendation"), str) or not ins["recommendation"].strip():
            ins["recommendation"] = "Monitor this metric and investigate further."
        # Confidence must be a number in [0, 1] or the Insight model rejects it.
        # Models sometimes answer 90 (percent) or "high".
        conf = ins.get("confidence")
        if isinstance(conf, bool) or not isinstance(conf, (int, float)):
            conf = 0.85
        elif 1 < conf <= 100:
            conf = conf / 100
        ins["confidence"] = min(max(float(conf), 0.0), 1.0)

    return insights


# ---------------------------------------------------------------------------
# Mock narrator (development mode)
# ---------------------------------------------------------------------------

def _mock_narrate(evidence_results: list[dict]) -> list[dict]:
    """
    Generate insights from evidence using deterministic templates.

    Each template name maps to a function that extracts key numbers
    from the evidence data and constructs an insight narrative.

    This produces realistic-looking insights without an API key, so you
    can develop and demo the full pipeline locally. The narratives are
    simpler than Claude's but they use the exact same numbers — because
    the numbers come from the evidence, not from an LLM.
    """
    generators = {
        "revenue_trend": _mock_revenue_trend,
        "category_comparison": _mock_category_comparison,
        "top_products": _mock_top_products,
        "aov_analysis": _mock_aov_analysis,
        "repeat_purchase": _mock_repeat_purchase,
    }

    narratives = []
    for r in evidence_results:
        template = r["template"]
        evidence = r["evidence"]
        generator = generators.get(template)

        narrative = None
        if generator:
            # A template sentence can't be written when its figures are
            # missing (e.g. a store with $0 revenue has no averages). Fall
            # through to the plain description instead of failing the report.
            try:
                narrative = generator(evidence)
            except Exception as e:
                logger.warning("Mock narrative for %s failed: %s", template, e)

        if narrative:
            narratives.append(narrative)
        else:
            # Generic fallback for unknown templates
            narratives.append({
                "template_used": template,
                "text": evidence.description,
                "priority": "medium",
                "confidence": 0.7,
                "recommendation": "Review this analysis and investigate further.",
            })

    return narratives


def _mock_revenue_trend(evidence: Evidence) -> dict:
    """Generate insight from revenue trend evidence."""
    data = [d for d in evidence.data if "revenue" in d]
    if len(data) < 2:
        return _generic(evidence, "revenue_trend")

    first = data[0]
    last = data[-1]

    # Find the month with the largest decline
    worst_growth = None
    for d in data:
        if d.get("growth_pct") is not None:
            if worst_growth is None or d["growth_pct"] < worst_growth.get("growth_pct", 0):
                worst_growth = d

    # Find peak
    peak = max(data, key=lambda d: d["revenue"])

    # Determine overall trend
    overall_change = last["revenue"] - first["revenue"]
    direction = "declined" if overall_change < 0 else "grew"

    text = (
        f"Monthly revenue {direction} from ${first['revenue']:,.2f} in {first['month']} "
        f"to ${last['revenue']:,.2f} in {last['month']}, "
        f"peaking at ${peak['revenue']:,.2f} in {peak['month']}."
    )

    if worst_growth and worst_growth["growth_pct"] < -5:
        text += (
            f" The sharpest decline was {worst_growth['growth_pct']}% "
            f"in {worst_growth['month']}."
        )

    priority = "high" if abs(overall_change) / max(first["revenue"], 1) > 0.1 else "medium"

    recommendation = (
        "Investigate what drove the decline after the peak month. "
        "Check for seasonality, marketing spend changes, or inventory issues."
        if direction == "declined" else
        "Revenue is trending positively. Identify which channels and products "
        "are driving growth to double down on them."
    )

    return {
        "template_used": "revenue_trend",
        "text": text,
        "priority": priority,
        "confidence": 0.92,
        "recommendation": recommendation,
    }


def _mock_category_comparison(evidence: Evidence) -> dict:
    """Generate insight from category comparison evidence."""
    data = evidence.data
    if not data:
        return _generic(evidence, "category_comparison")

    top = data[0]
    bottom = data[-1]

    text = (
        f"{top['category']} leads revenue at ${top['total_revenue']:,.2f} "
        f"({top['revenue_share_pct']}% share), while {bottom['category']} "
        f"trails at ${bottom['total_revenue']:,.2f} ({bottom['revenue_share_pct']}% share) "
        f"with an average order value of ${bottom['avg_order_value']:.2f}."
    )

    spread = top["revenue_share_pct"] - bottom["revenue_share_pct"]
    priority = "high" if spread > 25 else "medium"

    return {
        "template_used": "category_comparison",
        "text": text,
        "priority": priority,
        "confidence": 0.93,
        "recommendation": (
            f"Investigate why {bottom['category']} underperforms. Consider whether "
            f"it needs better merchandising, targeted promotions, or whether to "
            f"reallocate marketing budget toward {top['category']}."
        ),
    }


def _mock_top_products(evidence: Evidence) -> dict:
    """Generate insight from top products evidence."""
    products = [d for d in evidence.data if d.get("product") != "_summary"]
    summary = next((d for d in evidence.data if d.get("product") == "_summary"), None)

    if not products:
        return _generic(evidence, "top_products")

    top1 = products[0]
    text = (
        f"{top1['product']} is the top-selling product at "
        f"${top1['total_revenue']:,.2f} ({top1['revenue_share_pct']}% of total revenue)."
    )

    if summary:
        text += (
            f" Revenue is concentrated: {summary['products_for_80_pct']} out of "
            f"{summary['total_products']} products generate 80% of revenue."
        )

    return {
        "template_used": "top_products",
        "text": text,
        "priority": "medium",
        "confidence": 0.94,
        "recommendation": (
            f"Protect {top1['product']} sales — ensure stock availability and "
            f"prominence in marketing. For long-tail products, evaluate whether "
            f"to promote them or phase them out to reduce catalog complexity."
        ),
    }


def _mock_aov_analysis(evidence: Evidence) -> dict:
    """Generate insight from AOV analysis evidence."""
    summary = next((d for d in evidence.data if d.get("type") == "summary"), None)
    dist = [d for d in evidence.data if d.get("type") == "distribution"]

    if not summary:
        return _generic(evidence, "aov_analysis")

    # Find the dominant bucket
    top_bucket = max(dist, key=lambda d: d["order_count"]) if dist else None

    text = (
        f"Average order value is ${summary['overall_aov']:.2f} "
        f"(median ${summary['median_aov']:.2f}) across {summary['total_orders']:,} orders."
    )

    if top_bucket:
        text += (
            f" The majority of orders ({top_bucket['percentage']}%) fall "
            f"in the {top_bucket['bucket']} range."
        )

    # High AOV gap between mean and median suggests skew
    aov_gap = summary["overall_aov"] - summary["median_aov"]
    priority = "medium" if aov_gap > 10 else "low"

    return {
        "template_used": "aov_analysis",
        "text": text,
        "priority": priority,
        "confidence": 0.90,
        "recommendation": (
            "The gap between mean and median AOV suggests some high-value orders "
            "pull the average up. Consider bundle offers or free-shipping thresholds "
            "to move the median closer to the mean."
            if aov_gap > 10 else
            "AOV is stable. Test upselling and cross-selling strategies at checkout "
            "to incrementally increase basket size."
        ),
    }


def _mock_repeat_purchase(evidence: Evidence) -> dict:
    """Generate insight from repeat purchase evidence."""
    summary = next((d for d in evidence.data if d.get("type") == "summary"), None)

    if not summary:
        return _generic(evidence, "repeat_purchase")

    text = (
        f"{summary['repeat_rate_pct']}% of customers are repeat buyers, "
        f"generating {summary['repeat_revenue_share_pct']}% of total revenue. "
        f"Repeat buyers spend {summary['spend_multiplier']}x more "
        f"(${summary['avg_spend_repeat']:.2f}) than one-time buyers "
        f"(${summary['avg_spend_one_time']:.2f})."
    )

    priority = "high" if summary["repeat_revenue_share_pct"] > 50 else "medium"

    return {
        "template_used": "repeat_purchase",
        "text": text,
        "priority": priority,
        "confidence": 0.91,
        "recommendation": (
            f"Repeat buyers are the revenue backbone at {summary['repeat_revenue_share_pct']}% "
            f"of revenue. Invest in retention: loyalty programs, post-purchase email sequences, "
            f"and personalized recommendations. "
            f"For one-time buyers, implement a win-back campaign within 30 days of first purchase."
        ),
    }


def _generic(evidence: Evidence, template: str) -> dict:
    """Fallback when evidence data is insufficient for a specific narrative."""
    return {
        "template_used": template,
        "text": evidence.description,
        "priority": "low",
        "confidence": 0.6,
        "recommendation": "Review this analysis for additional context.",
    }
