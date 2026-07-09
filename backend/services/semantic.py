"""
services/semantic.py
--------------------
Stage 2 of the profiling pipeline: LLM-powered semantic classification.

This service takes the statistical profile from Stage 1 (services/profiler.py)
and asks Claude to classify each column into a business role from the
e-commerce ontology.

Architecture overview:

  CSV File
    → [Stage 1: profiler.py]  Deterministic stats (pandas)
    → [Stage 2: semantic.py]  Semantic classification (Claude)
    → Complete DataProfile

Why two stages?

  LLMs are unreliable at computation. If you ask Claude "what's the average
  of this column?", it might hallucinate a number. But LLMs are excellent at
  pattern recognition and semantic understanding — exactly what's needed to
  figure out that a column called "amt" with values in the range [5.99, 499.99]
  is "revenue" rather than "quantity".

  By computing statistics deterministically first, we:
    1. Guarantee numerical accuracy
    2. Reduce token usage (send ~800 tokens of profile vs ~50k of raw data)
    3. Keep user data out of API calls (privacy)
    4. Make the LLM's job narrow and well-defined (classification, not computation)

  Interview talking point:
    "I separate deterministic computation from LLM inference because language
    models are non-deterministic — you wouldn't use a random number generator
    as a calculator. The LLM's role is narrowed to semantic understanding,
    which is what it's actually good at."

Reliability engineering:

  LLM responses are non-deterministic. This service handles three failure modes:
    1. Malformed JSON → retry with a correction prompt
    2. Valid JSON but wrong schema → retry with specific error feedback
    3. Retry also fails → graceful fallback to "other" for all roles

  This is a production pattern used at companies like Anthropic and OpenAI
  in their own tooling. Showing you understand this is a strong signal.
"""

from __future__ import annotations

import json
import logging

import anthropic

from config import settings
from models.schemas import DataProfile, SemanticRole
from prompts.profiler_v1 import (
    CORRECTION_PROMPT,
    SYSTEM_PROMPT,
    USER_PROMPT_TEMPLATE,
    format_column_for_prompt,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def classify_columns(profile: DataProfile) -> DataProfile:
    """
    Enhance a DataProfile with LLM-powered semantic column classifications.

    Takes the deterministic profile (with all columns set to semantic_role="other")
    and returns an updated profile where each column has a meaningful business role.

    This function is designed to be safe:
      - If the API key is missing, it returns the profile unchanged.
      - If the LLM returns garbage, it retries once with a correction prompt.
      - If the retry also fails, it falls back gracefully (all roles stay "other").

    Args:
        profile: DataProfile from the deterministic profiler (Stage 1).

    Returns:
        Updated DataProfile with semantic roles, grain, and summary filled in.
    """
    if not settings.ANTHROPIC_API_KEY:
        logger.warning(
            "ANTHROPIC_API_KEY not set — using mock semantic classifier. "
            "Set the key in .env to enable Claude-powered classification."
        )
        result = _mock_classify(profile)
        return _apply_classifications(profile, result)

    # --- Build the prompt ---
    prompt = _build_classification_prompt(profile)

    # --- Call Claude with retry logic ---
    result = await _call_claude_with_retry(prompt)

    if result is None:
        logger.warning("Semantic profiling failed after retries — using fallback")
        return profile

    # --- Apply classifications to the profile ---
    return _apply_classifications(profile, result)


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def _build_classification_prompt(profile: DataProfile) -> str:
    """
    Build the user prompt from the DataProfile.

    Key design decision: we send the statistical profile, NOT raw data rows.
    The column_profiles block contains dtype, unique counts, ranges, and top
    values — enough for the LLM to make semantic classifications without
    ever seeing actual customer data.
    """
    # Format each column's stats into readable text
    column_profiles_text = "\n".join(
        format_column_for_prompt(col.model_dump())
        for col in profile.columns
    )

    # Format date range
    if profile.date_range:
        date_range = (
            f"{profile.date_range.start} to {profile.date_range.end} "
            f"({profile.date_range.span_days} days)"
        )
    else:
        date_range = "No date column detected"

    return USER_PROMPT_TEMPLATE.format(
        filename=profile.filename,
        row_count=profile.row_count,
        date_range=date_range,
        column_profiles=column_profiles_text,
    )


# ---------------------------------------------------------------------------
# Claude API call with structured output validation and retry
# ---------------------------------------------------------------------------

async def _call_claude_with_retry(prompt: str) -> dict | None:
    """
    Call Claude and validate the response against our expected schema.

    Retry strategy:
      1. First attempt: send the classification prompt
      2. If response is invalid JSON or wrong schema: retry with correction prompt
      3. If retry also fails: return None (caller handles fallback)

    Why not more retries?
      Diminishing returns. If the model fails twice with explicit correction,
      a third attempt rarely succeeds. Better to fail fast and fall back
      gracefully than to burn API credits and latency.

    Why not use Claude's tool_use / JSON mode?
      Tool use is a valid approach, but explicit prompt-based JSON extraction
      with validation demonstrates more AI engineering depth for a portfolio
      project. It shows you understand the validation problem rather than
      relying on a framework feature to solve it.
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # --- First attempt ---
    try:
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw_text = _extract_text(response)
        result = _parse_and_validate(raw_text)

        if result is not None:
            logger.info("Semantic profiling succeeded on first attempt")
            return result

        first_error = "Response did not match expected schema"

    except json.JSONDecodeError as e:
        first_error = f"Invalid JSON: {e}"
        logger.warning(f"First attempt failed: {first_error}")
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        return None

    # --- Retry with correction prompt ---
    logger.info(f"Retrying semantic profiling with correction prompt...")

    try:
        correction = CORRECTION_PROMPT.format(error=first_error)

        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": raw_text if "raw_text" in dir() else ""},
                {"role": "user", "content": correction},
            ],
        )

        raw_text = _extract_text(response)
        result = _parse_and_validate(raw_text)

        if result is not None:
            logger.info("Semantic profiling succeeded on retry")
            return result

        logger.warning("Retry also produced invalid output")
        return None

    except Exception as e:
        logger.error(f"Retry failed: {e}")
        return None


def _extract_text(response) -> str:
    """Extract text content from Claude's response."""
    return "".join(
        block.text for block in response.content if block.type == "text"
    )


def _parse_and_validate(raw_text: str) -> dict | None:
    """
    Parse LLM output as JSON and validate against our expected structure.

    This is a critical reliability layer. LLMs can return:
      - Valid JSON with wrong keys
      - JSON wrapped in markdown backticks
      - Partial JSON with trailing explanation text
      - Completely unrelated output

    We handle all of these gracefully.
    """
    # Strip markdown code fences if present
    text = raw_text.strip()
    if text.startswith("```"):
        # Remove ```json and trailing ```
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    # Parse JSON
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object within the text (LLM sometimes adds preamble)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                data = json.loads(text[start:end])
            except json.JSONDecodeError:
                return None
        else:
            return None

    # --- Validate structure ---
    if not isinstance(data, dict):
        return None

    if "columns" not in data or not isinstance(data["columns"], list):
        return None

    # Validate each column classification
    valid_roles = {role.value for role in SemanticRole}
    for col in data["columns"]:
        if not isinstance(col, dict) or "name" not in col:
            return None
        # Normalize semantic_role to a valid enum value
        role = col.get("semantic_role", "other")
        if role not in valid_roles:
            col["semantic_role"] = "other"

    # Ensure grain and summary exist (use defaults if missing)
    data.setdefault("grain", "unknown")
    data.setdefault("summary", "E-commerce dataset")

    return data


# ---------------------------------------------------------------------------
# Apply classifications back to the DataProfile
# ---------------------------------------------------------------------------

def _apply_classifications(profile: DataProfile, result: dict) -> DataProfile:
    """
    Merge LLM classifications into the existing DataProfile.

    Creates a lookup from the LLM's response and applies it to each column.
    Columns the LLM didn't classify keep their default "other" role.

    Also updates dimension/measure flags based on semantic roles:
      - Identifiers and categories are dimensions (group-by columns)
      - Revenue, quantity, discount are measures (aggregatable columns)
    """
    # Build a lookup: column_name → classification
    classifications = {
        col["name"]: col
        for col in result.get("columns", [])
    }

    # Roles that indicate a measure (aggregatable numeric value)
    measure_roles = {
        SemanticRole.REVENUE,
        SemanticRole.QUANTITY,
        SemanticRole.DISCOUNT,
    }

    # Roles that indicate a dimension (grouping / segmentation)
    dimension_roles = {
        SemanticRole.CUSTOMER_ID,
        SemanticRole.ORDER_ID,
        SemanticRole.PRODUCT,
        SemanticRole.CATEGORY,
        SemanticRole.DATE,
        SemanticRole.REGION,
        SemanticRole.CHANNEL,
        SemanticRole.STATUS,
    }

    # Apply classifications
    for col in profile.columns:
        if col.name in classifications:
            cls = classifications[col.name]
            role_str = cls.get("semantic_role", "other")

            try:
                col.semantic_role = SemanticRole(role_str)
            except ValueError:
                col.semantic_role = SemanticRole.OTHER

            # Update dimension/measure based on semantic understanding
            if col.semantic_role in measure_roles:
                col.is_measure = True
                col.is_dimension = False
            elif col.semantic_role in dimension_roles:
                col.is_dimension = True
                col.is_measure = False

    # Apply dataset-level metadata
    profile.grain = result.get("grain")
    profile.summary = result.get("summary")

    return profile


# ---------------------------------------------------------------------------
# Mock classifier (development mode)
# ---------------------------------------------------------------------------

# Rule-based keyword mapping: if any keyword appears in the column name
# (case-insensitive), assign that semantic role. Order matters — first
# match wins, so more specific patterns go first.
#
# English rules
_MOCK_RULES: list[tuple[list[str], str]] = [
    # Identifiers
    (["order_id", "order_no", "order_number", "transaction_id"],  "order_id"),
    (["customer_id", "cust_id", "user_id", "buyer_id"],          "customer_id"),

    # Date/time
    (["order_date", "purchase_date", "created_at", "date",
      "timestamp", "order_time"],                                 "date"),

    # Product & category
    (["product_name", "product_title", "item_name", "product"],   "product"),
    (["category", "department", "product_category", "genre"],     "category"),

    # Measures
    (["total_amount", "revenue", "sales", "total_price",
      "gross", "net_amount", "amount"],                           "revenue"),
    (["quantity", "qty", "units", "item_count"],                  "quantity"),
    (["discount", "discount_pct", "discount_amount", "coupon"],   "discount"),

    # Dimensions
    (["region", "state", "country", "city", "location", "geo"],   "region"),
    (["channel", "source", "medium", "platform", "utm_source"],   "channel"),
    (["status", "order_status", "fulfillment", "payment_status"], "status"),
]

# Chinese rules — exact match only, ordered so specific terms beat general ones.
# Precedence: 产品类别 → category (not product), 产品名称 → product,
#             订单日期 → date, 发货时间 → other, 发货模式 → channel.
_CHINESE_RULES: list[tuple[list[str], str]] = [
    # --- Identifiers ---
    (["订单id", "订单编号", "订单号"],                              "order_id"),
    (["客户id", "客户编号", "用户id", "会员id"],                    "customer_id"),

    # --- Date (only order date, not shipping date) ---
    (["订单日期", "下单日期", "下单时间", "日期"],                  "date"),

    # --- Category BEFORE product (产品类别 must not match product) ---
    (["产品类别", "商品类别", "品类", "类别",
      "产品子类别", "商品子类别", "子类别"],                        "category"),

    # --- Product ---
    (["产品名称", "商品名称", "产品", "商品",
      "产品id", "产品编号", "商品id"],                              "product"),

    # --- Measures ---
    (["销售额", "销售金额", "金额", "收入", "营收", "gmv"],        "revenue"),
    (["销售量", "数量", "件数", "购买数量"],                        "quantity"),
    (["折扣", "折扣率", "优惠"],                                   "discount"),

    # --- Dimensions ---
    (["客户所在城市", "客户所在州", "客户所在国家",
      "分店所属区域", "分店所属州",
      "地区", "区域", "城市", "州", "国家"],                       "region"),
    (["发货模式", "配送方式", "渠道", "平台", "来源"],             "channel"),
    (["订单优先级", "订单状态", "状态"],                            "status"),
]


def _mock_classify(profile: DataProfile) -> dict:
    """
    Rule-based semantic classifier for development without an API key.

    Uses keyword matching on column names to assign semantic roles.
    Produces the same output structure as Claude would, so the rest of
    the pipeline doesn't know the difference.

    Supports both English and Chinese column names.
    """
    columns = []

    for col in profile.columns:
        role = _match_role(col.name)
        columns.append({
            "name": col.name,
            "semantic_role": role,
            "confidence": 1.0 if role != "other" else 0.0,
            "reasoning": "mock: rule-based keyword match" if role != "other"
                         else "mock: no matching rule",
        })

    # Infer grain from what we found
    has_order_id = any(c["semantic_role"] == "order_id" for c in columns)
    has_product = any(c["semantic_role"] == "product" for c in columns)

    if has_order_id and has_product:
        grain = "One row per order line item (order × product)"
    elif has_order_id:
        grain = "One row per order"
    else:
        grain = "Unknown granularity"

    # Build a summary from what we know
    summary = (
        f"E-commerce dataset with {profile.row_count:,} rows "
        f"and {profile.column_count} columns"
    )
    if profile.date_range:
        summary += (
            f", spanning {profile.date_range.start} to {profile.date_range.end}"
            f" ({profile.date_range.span_days} days)"
        )

    logger.info(
        "Mock classifier assigned roles: %s",
        {c["name"]: c["semantic_role"] for c in columns if c["semantic_role"] != "other"},
    )

    return {
        "columns": columns,
        "grain": grain,
        "summary": summary,
    }


def _match_role(column_name: str) -> str:
    """
    Match a column name against both Chinese and English rule tables.

    Match order:
      1. Chinese exact match (highest priority — handles 产品类别 vs 产品名称)
      2. English exact match
      3. English partial/substring match (fallback)

    Returns the semantic role string, or 'other' if no rule matches.
    """
    name_lower = column_name.lower().strip()

    # --- Pass 1: Chinese exact match ---
    for keywords, role in _CHINESE_RULES:
        if name_lower in keywords:
            return role

    # --- Pass 2: English exact match ---
    for keywords, role in _MOCK_RULES:
        if name_lower in keywords:
            return role

    # --- Pass 3: English partial/substring match ---
    for keywords, role in _MOCK_RULES:
        for keyword in keywords:
            if keyword in name_lower or name_lower in keyword:
                return role

    return "other"