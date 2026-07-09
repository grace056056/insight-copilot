"""
prompts/narrator_v1.py
----------------------
Prompt templates for the narrative synthesis step.

Version: 1
Purpose: Convert deterministic Evidence objects into human-readable
         business insights with priorities and recommendations.

Critical constraint:
  The LLM must NOT compute, estimate, or invent any numbers. Every
  numerical claim in the output must come directly from the evidence
  data provided. The LLM's job is narrative — turning structured data
  into sentences a business owner can act on.

Why this constraint matters:
  If the evidence says revenue dropped 12.4% in April, the LLM writes
  "Revenue declined 12.4% in April." It does NOT say "Revenue declined
  roughly 12%" (rounding it could mislead) or "Revenue fell ~15%"
  (hallucinating a different number). The evidence is the single source
  of truth, and the narrative must be faithful to it.

Changelog:
  v1 (initial) — E-commerce narrator with priority ranking.
"""

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a senior e-commerce business analyst writing insights for a store owner.

CRITICAL RULES:
1. Every number you mention MUST come directly from the evidence data provided.
   Do NOT compute, round, estimate, or invent any numbers.
2. Write in clear, direct business language. No jargon, no filler.
3. Each insight must be actionable — tell the owner what the data means
   for their business and what they should consider doing about it.
4. Respond with ONLY valid JSON. No markdown, no backticks, no explanation.
"""

# ---------------------------------------------------------------------------
# User prompt template
# ---------------------------------------------------------------------------

USER_PROMPT_TEMPLATE = """Convert these evidence objects into business insights.

## Evidence from analysis templates

{evidence_blocks}

## Instructions

For each evidence object, write ONE business insight. Each insight must:
- State a specific finding using ONLY numbers from the evidence (do not calculate new numbers)
- Explain why this matters for an e-commerce business
- Include an actionable recommendation

Assign priority based on business impact:
- "high" = revenue impact, customer loss risk, or urgent trend
- "medium" = notable pattern worth monitoring
- "low" = interesting finding, no immediate action needed

## Required JSON response format

{{
  "insights": [
    {{
      "template_used": "the template name from the evidence",
      "text": "one-sentence finding with specific numbers from the evidence",
      "priority": "high|medium|low",
      "confidence": 0.95,
      "recommendation": "specific action the business should consider"
    }}
  ]
}}

Return one insight per evidence object. Use exact numbers from the evidence data.
"""

# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["insights"],
    "properties": {
        "insights": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["template_used", "text", "priority", "recommendation"],
                "properties": {
                    "template_used": {"type": "string"},
                    "text": {"type": "string"},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                    "confidence": {"type": "number"},
                    "recommendation": {"type": "string"},
                },
            },
        },
    },
}

# ---------------------------------------------------------------------------
# Correction prompt
# ---------------------------------------------------------------------------

CORRECTION_PROMPT = """Your previous response was not valid JSON or did not match the required schema.

Error: {error}

Respond with ONLY a valid JSON object:
{{
  "insights": [
    {{
      "template_used": "template_name",
      "text": "finding with specific numbers",
      "priority": "high|medium|low",
      "confidence": 0.9,
      "recommendation": "actionable next step"
    }}
  ]
}}

Do not include markdown backticks. Respond with raw JSON only.
"""


# ---------------------------------------------------------------------------
# Helper: format evidence for the prompt
# ---------------------------------------------------------------------------

def format_evidence_for_prompt(template_name: str, evidence_dict: dict) -> str:
    """
    Format a single evidence object into a readable block for the LLM.

    We send the description and key data points — enough context for the
    LLM to write a meaningful narrative without needing the raw dataset.
    """
    lines = [f"### Template: {template_name}"]
    lines.append(f"Description: {evidence_dict['description']}")
    lines.append(f"Chart type: {evidence_dict['chart_type']}")

    if evidence_dict.get("highlight"):
        lines.append(f"Highlighted item: {evidence_dict['highlight']}")

    lines.append("Data:")
    # Include all data points (they're already aggregated and small)
    for row in evidence_dict["data"]:
        lines.append(f"  {row}")

    return "\n".join(lines)
