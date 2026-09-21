"""Defensive parsing of LLM output (no API calls)."""

from services.narrator import _parse_narrator_response
from services.semantic import _parse_and_validate


def test_semantic_parser_strips_code_fences():
    raw = '```json\n{"columns": [{"name": "total_amount", "semantic_role": "revenue"}]}\n```'
    data = _parse_and_validate(raw)
    assert data["columns"][0]["semantic_role"] == "revenue"
    assert data["grain"] == "unknown"  # default filled in


def test_semantic_parser_extracts_json_after_preamble():
    raw = 'Sure! Here is the result:\n{"columns": [{"name": "region", "semantic_role": "region"}]}'
    assert _parse_and_validate(raw)["columns"][0]["name"] == "region"


def test_semantic_parser_normalizes_unknown_roles():
    raw = '{"columns": [{"name": "x", "semantic_role": "profit_margin"}]}'
    assert _parse_and_validate(raw)["columns"][0]["semantic_role"] == "other"


def test_semantic_parser_rejects_garbage():
    assert _parse_and_validate("I could not classify these columns.") is None
    assert _parse_and_validate('{"not_columns": []}') is None


def test_narrator_parser_fills_defaults():
    raw = '{"insights": [{"text": "Revenue rose.", "template_used": "revenue_trend", "priority": "urgent"}]}'
    (ins,) = _parse_narrator_response(raw)
    assert ins["priority"] == "medium"  # invalid priority normalized
    assert "recommendation" in ins


def test_narrator_parser_rejects_missing_fields():
    assert _parse_narrator_response('{"insights": [{"text": "no template"}]}') is None
    assert _parse_narrator_response('{"insights": []}') is None
