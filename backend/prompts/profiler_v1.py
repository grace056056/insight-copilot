"""
prompts/profiler_v1.py
----------------------
Prompt templates for the semantic column classification step.

Version: 1
Purpose: Given a statistical profile of a dataset, classify each column
         into a business role from an e-commerce ontology.

Design decisions:

  1. VERSIONED PROMPTS — This file is named _v1 deliberately. In production
     AI systems, prompts evolve constantly. A prompt change can silently break
     downstream logic (e.g., the analysis templates expect "revenue" but the
     prompt now outputs "sales"). Versioning makes regression trackable.
     Interview line: "I treat prompts as versioned artifacts, not inline strings."

  2. SEPARATED CONCERNS — The prompt receives a statistical profile, NOT raw
     CSV rows. This means:
       - The LLM classifies based on column names + computed statistics
       - It never sees actual customer data (privacy-friendly)
       - Token usage is predictable (~800 tokens input vs ~50k for raw data)
       - Numerical accuracy comes from the profiler, not the LLM

  3. STRUCTURED OUTPUT — We define a JSON schema the LLM must follow.
     This enables validation + retry on malformed responses rather than
     hoping the LLM formats things correctly.

  4. E-COMMERCE ONTOLOGY — The semantic roles are a closed enum, not free-text.
     This constrains the LLM's output space and makes downstream template
     matching reliable. A template that needs "revenue" will always find
     "revenue" — never "sales", "income", "total", etc.

Changelog:
  v1 (initial) — E-commerce ontology with 12 semantic roles.
"""

# ---------------------------------------------------------------------------
# System prompt: defines the LLM's role and constraints
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a data schema analyst specializing in e-commerce datasets.

Your job is to classify each column in a dataset into a specific business role
based on its name, data type, and statistical profile.

Rules:
- Respond with ONLY valid JSON. No markdown, no backticks, no explanation.
- Every column must be assigned exactly one semantic_role from the allowed list.
- Use the statistical profile (unique counts, top values, ranges) to resolve
  ambiguous column names. For example, a column named "amount" with values
  ranging from 5-500 is likely "revenue", not "quantity".
- If a column does not clearly fit any specific role, assign "other".
- Also infer the dataset's grain (what each row represents) and write a
  one-sentence business summary of the dataset.
"""

# ---------------------------------------------------------------------------
# User prompt template: filled with the actual statistical profile at runtime
# ---------------------------------------------------------------------------

USER_PROMPT_TEMPLATE = """Classify each column in this dataset into a semantic business role.

## Dataset info
Filename: {filename}
Rows: {row_count}
Date range: {date_range}

## Column profiles
{column_profiles}

## Allowed semantic roles (you MUST use one of these exactly)
- "revenue"      → monetary amount for a transaction (total price, sales amount)
- "quantity"     → count of items in an order
- "customer_id"  → unique customer identifier
- "order_id"     → unique order/transaction identifier
- "product"      → product name or title
- "category"     → product category or department
- "date"         → order date, transaction date, or timestamp
- "discount"     → discount percentage or amount
- "region"       → geographic region, state, country, or city
- "channel"      → sales channel (website, mobile, social, etc.)
- "status"       → order status (completed, refunded, cancelled, etc.)
- "other"        → does not fit any of the above roles

## Required JSON response format
{{
  "columns": [
    {{
      "name": "column_name",
      "semantic_role": "one_of_the_roles_above",
      "confidence": 0.95,
      "reasoning": "brief explanation of why this role was chosen"
    }}
  ],
  "grain": "what each row represents, e.g. 'one row per order line item'",
  "summary": "one-sentence business summary of this dataset"
}}
"""

# ---------------------------------------------------------------------------
# Response schema: defines what we expect back from the LLM
# ---------------------------------------------------------------------------

RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["columns", "grain", "summary"],
    "properties": {
        "columns": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "semantic_role"],
                "properties": {
                    "name": {"type": "string"},
                    "semantic_role": {
                        "type": "string",
                        "enum": [
                            "revenue", "quantity", "customer_id", "order_id",
                            "product", "category", "date", "discount",
                            "region", "channel", "status", "other",
                        ],
                    },
                    "confidence": {"type": "number"},
                    "reasoning": {"type": "string"},
                },
            },
        },
        "grain": {"type": "string"},
        "summary": {"type": "string"},
    },
}

# ---------------------------------------------------------------------------
# Correction prompt: sent on retry when the first response is malformed
# ---------------------------------------------------------------------------

CORRECTION_PROMPT = """Your previous response was not valid JSON or did not match the required schema.

Error: {error}

Please respond with ONLY a valid JSON object matching this exact structure:
{{
  "columns": [
    {{"name": "column_name", "semantic_role": "role", "confidence": 0.9, "reasoning": "why"}}
  ],
  "grain": "what each row represents",
  "summary": "one-sentence dataset summary"
}}

Allowed semantic_role values: revenue, quantity, customer_id, order_id, product,
category, date, discount, region, channel, status, other.

Do not include markdown backticks. Respond with raw JSON only.
"""


# ---------------------------------------------------------------------------
# Helper: format a column profile for the prompt
# ---------------------------------------------------------------------------

def format_column_for_prompt(col: dict) -> str:
    """
    Format a single column's profile into a human-readable string for the LLM.

    We send computed statistics, NOT raw data values. This is a key design
    decision — the LLM classifies based on metadata, not data content.
    """
    lines = [f"- Column: \"{col['name']}\""]
    lines.append(f"  Type: {col['dtype']}")
    lines.append(f"  Unique values: {col['stats']['unique_count']} / {col['stats']['total_count']}")
    lines.append(f"  Null %: {col['stats']['nullable_pct']}%")

    # Numeric stats
    if col["stats"].get("min") is not None:
        lines.append(
            f"  Range: [{col['stats']['min']} .. {col['stats']['max']}]"
            f"  Mean: {col['stats']['mean']}"
        )

    # Top values for categorical columns
    if col["stats"].get("top_values"):
        top = col["stats"]["top_values"][:4]
        vals = ", ".join(f"\"{v['value']}\" ({v['count']})" for v in top)
        lines.append(f"  Top values: {vals}")

    return "\n".join(lines)
