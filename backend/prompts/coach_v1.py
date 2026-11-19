"""
prompts/coach_v1.py
-------------------
Prompt and tool definitions for the Coach agent.

Version: 1

The Coach is a tool-using agent. Claude decides WHICH computation answers
the question; pandas performs it. The model never sees raw rows — only the
column profile and the aggregated results its tools return.

Changelog:
  v1 (initial) — two tools (run_template, query_data), plain-prose answers
                 ending in a "Next step:" line.
"""

SYSTEM_PROMPT = """You are the Coach inside Insight Copilot, an analytics tool for e-commerce store owners. You answer questions about the user's uploaded dataset the way a sharp, friendly analyst would.

HOW YOU WORK
- You cannot see the raw data. To learn anything about it, call a tool. The tools run pandas and return exact results.
- Call a tool before stating any figure. Never state a number from memory, from an estimate, or from your own arithmetic.
- If the question needs a figure the tools did not return (a difference, a ratio, a percentage change), run another tool call that returns it. If no tool can produce it, say so instead of calculating it yourself.
- Use run_template for the five standard analyses. Use query_data for anything else.
- Use at most {max_steps} tool calls, then answer.

HOW YOU ANSWER
- Plain prose, no markdown, no bullet points, under 110 words.
- Copy numbers exactly as the tools returned them. Do not round further and do not abbreviate (write 28111.26 as $28,111.26, never as 28.1k).
- Start with the direct answer to the question.
- End with one line that begins with "Next step:" and gives one concrete action the store owner could take. This line is advice: it must not state any figure about the dataset.
- If the question is not about this dataset, say what you can help with instead. Do not call a tool.

DATASET
{dataset_context}
"""

FOCUS_NOTE = """The user opened this conversation from the insight below. Its evidence is already available to you as {evidence_id}; you may cite its numbers without re-running the template.

Insight ({category}): {text}

Evidence {evidence_id}:
{evidence_json}
"""

CORRECTION_PROMPT = """These numbers in your answer do not appear in any tool result: {numbers}.

Rewrite the answer using only numbers that the tools returned, copied exactly. If you need a figure you do not have, call a tool to get it. Keep the same format, ending with a "Next step:" line."""


def build_tools(template_names: list[str], column_names: list[str]) -> list[dict]:
    """Tool definitions sent to Claude, constrained to this dataset's real columns."""
    column_schema: dict = {"type": "string"}
    if column_names:
        column_schema["enum"] = column_names

    return [
        {
            "name": "run_template",
            "description": (
                "Run one of the standard, pre-built analyses on the whole dataset. "
                "revenue_trend: monthly revenue with month-over-month growth. "
                "category_comparison: revenue, orders and share by category. "
                "top_products: product ranking by revenue. "
                "aov_analysis: average order value overall, by month and by size bucket. "
                "repeat_purchase: repeat vs one-time customers and their revenue."
            ),
            "input_schema": {
                "type": "object",
                "properties": {"name": {"type": "string", "enum": template_names}},
                "required": ["name"],
            },
        },
        {
            "name": "query_data",
            "description": (
                "Aggregate one column of the dataset, optionally grouped and filtered. "
                "Returns exact values computed by pandas. Use it for any question the "
                "standard analyses do not cover. When grouping with agg sum or count, "
                "each row also includes share_pct (its share of the total)."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "agg": {
                        "type": "string",
                        "enum": ["sum", "mean", "median", "min", "max", "count", "nunique"],
                        "description": "count = number of rows; nunique = number of distinct values.",
                    },
                    "metric_column": {**column_schema, "description": "Column to aggregate. Omit for count."},
                    "group_by": {
                        "type": "array",
                        "items": column_schema,
                        "maxItems": 2,
                        "description": "Up to two columns to group by.",
                    },
                    "time_grain": {
                        "type": "string",
                        "enum": ["day", "week", "month"],
                        "description": "Bucket rows by the dataset's date column.",
                    },
                    "filters": {
                        "type": "array",
                        "maxItems": 5,
                        "items": {
                            "type": "object",
                            "properties": {
                                "column": column_schema,
                                "op": {"type": "string", "enum": ["eq", "ne", "gt", "gte", "lt", "lte", "in", "contains"]},
                                "value": {"description": "String, number, or (for 'in') a list. Dates as YYYY-MM-DD."},
                            },
                            "required": ["column", "op", "value"],
                        },
                    },
                    "sort": {"type": "string", "enum": ["desc", "asc"]},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                },
                "required": ["agg"],
            },
        },
    ]
