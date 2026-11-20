"""
agent/grounding.py
------------------
The numeric grounding check.

After the Coach writes an answer, every number in that answer is looked up
in the Evidence gathered during the turn. A number that cannot be found is
reported as unverified. This turns "the model was told not to invent
numbers" into something the system actually checks.

What counts as grounded:
  - the number equals an evidence value once that value is rounded to the
    precision the answer used ("$28,111.26" and "28111.3" both match 28111.26)
  - sign is ignored, so "declined 12.4%" matches a stored -12.4
  - digits inside evidence strings count ("2024-03" grounds 2024 and 3)

What is deliberately NOT checked:
  - whole numbers from 0 to 10 ("the top 3", "2 regions")
  - numbers the user typed in their own question
  - numbers from earlier turns of the conversation, which were checked
    when they were first produced
  - in mock mode only, the "Next step" recommendation, which is fixed
    template text

Anything the model derives itself — a difference, a ratio, an abbreviation
like "28.1k" — fails the check on purpose.
"""

from __future__ import annotations

import re
from typing import Any, Iterable

_NUMBER = re.compile(r"(?<![\w.])-?\$?\d[\d,]*(?:\.\d+)?")
_SMALL_INT_MAX = 10


def extract_numbers(text: str) -> list[str]:
    """Number tokens as written, minus currency symbols and thousands separators."""
    tokens = []
    for m in _NUMBER.finditer(text):
        token = m.group(0).replace("$", "").replace(",", "").rstrip(".")
        if token and token not in ("-",):
            tokens.append(token)
    return tokens


def collect_evidence_numbers(values: Iterable[Any]) -> set[float]:
    """Flatten nested evidence into the set of numbers it contains."""
    found: set[float] = set()

    def walk(v: Any) -> None:
        if isinstance(v, bool) or v is None:
            return
        if isinstance(v, (int, float)):
            found.add(float(v))
        elif isinstance(v, str):
            for token in extract_numbers(v):
                found.add(float(token))
        elif isinstance(v, dict):
            for item in v.values():
                walk(item)
        elif isinstance(v, (list, tuple, set)):
            for item in v:
                walk(item)

    walk(list(values))
    return found


def find_unverified(answer: str, evidence_numbers: set[float], exempt_text: str = "") -> list[str]:
    """Numbers in `answer` that do not appear in the evidence."""
    exempt = {abs(float(t)) for t in extract_numbers(exempt_text)}
    pool = {abs(v) for v in evidence_numbers}
    unverified: list[str] = []

    for token in extract_numbers(answer):
        value = abs(float(token))
        decimals = len(token.split(".")[1]) if "." in token else 0
        if decimals == 0 and value <= _SMALL_INT_MAX:
            continue
        if value in exempt:
            continue
        tolerance = 0.5 * 10 ** (-decimals) + 1e-9
        if any(abs(v - value) <= tolerance for v in pool):
            continue
        if token not in unverified:
            unverified.append(token)
    return unverified
