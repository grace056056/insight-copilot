# Tests

Run from `backend/`:

```bash
pip install -r requirements-dev.txt
python -m pytest
```

All tests run offline: `conftest.py` forces mock mode, so no Anthropic API key is needed and no API calls are made.

| File | What it checks |
|---|---|
| `test_profiler.py` | Row/column counts, dtype detection, date range, null rate and numeric stats, CSV/TSV/XLSX parsing, clean error on a corrupt workbook |
| `test_templates.py` | All 5 templates registered and runnable on the sample data; revenue trend recomputed independently in pandas and compared value by value; registry skips templates whose required roles are missing; one failing template doesn't stop the rest |
| `test_llm_parsing.py` | Semantic and narrator parsers handle code fences, preamble text, unknown roles, invalid priorities, and reject malformed output |
| `test_api.py` | Health check, input validation (unsupported type, empty file, no dataset loaded), full upload → evidence → insights flow, manual role override |
