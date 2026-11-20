"""
Things that used to break:

  * the insight writer (narrator) was trusted to copy numbers correctly
  * awkward but realistic files crashed the API with a 500
"""

import asyncio
import io
import json
from types import SimpleNamespace

import anthropic
import numpy as np
import pandas as pd
import pytest

from analysis.registry import run_all
from config import settings
from services import narrator
from services.profiler import profile_csv
from tests.conftest import SAMPLE_PATH, kept


# ---------------------------------------------------------------------------
# Narrator: numbers are checked against the evidence
# ---------------------------------------------------------------------------

class FakeAnthropic:
    """Stands in for anthropic.Anthropic and replays queued response texts."""

    def __init__(self, *texts):
        self.texts = list(texts)
        self.calls = []
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        text = self.texts.pop(0)
        if isinstance(text, Exception):
            raise text
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)])


def narrate(monkeypatch, evidence_results, fake):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(anthropic, "Anthropic", lambda **kw: fake)
    return asyncio.run(narrator.generate_insights(evidence_results))


def payload(*insights):
    return json.dumps({"insights": [
        {"priority": "high", "confidence": 0.9, "recommendation": "Review this.", **i} for i in insights
    ]})


@pytest.fixture
def evidence_results(sample_profiled):
    profile, df = sample_profiled
    return run_all(df, profile)


def trend_peak(evidence_results):
    trend = next(r for r in evidence_results if r["template"] == "revenue_trend")["evidence"]
    return max(row["revenue"] for row in trend.data)


def test_narrator_keeps_an_insight_whose_numbers_match(monkeypatch, evidence_results):
    peak = trend_peak(evidence_results)
    fake = FakeAnthropic(payload({"template_used": "revenue_trend", "text": f"Revenue peaked at ${peak:,.2f}."}))
    (insight,) = narrate(monkeypatch, evidence_results, fake)
    assert f"{peak:,.2f}" in insight.text
    assert len(fake.calls) == 1


def test_narrator_asks_for_a_rewrite_when_a_number_is_invented(monkeypatch, evidence_results):
    peak = trend_peak(evidence_results)
    fake = FakeAnthropic(
        payload({"template_used": "revenue_trend", "text": "Revenue peaked at $987,654.32."}),
        payload({"template_used": "revenue_trend", "text": f"Revenue peaked at ${peak:,.2f}."}),
    )
    (insight,) = narrate(monkeypatch, evidence_results, fake)
    assert "987,654.32" not in insight.text
    assert "987654.32" in fake.calls[1]["messages"][-1]["content"]


def test_narrator_swaps_in_the_template_sentence_if_the_rewrite_still_fails(monkeypatch, evidence_results):
    peak = trend_peak(evidence_results)
    bad = payload(
        {"template_used": "revenue_trend", "text": "Revenue peaked at $987,654.32."},
        {"template_used": "aov_analysis", "text": "Order value is healthy.",
         "recommendation": "Offer a 37% discount."},
    )
    insights = narrate(monkeypatch, evidence_results, FakeAnthropic(bad, bad))
    text = " ".join(i.text + i.recommendation for i in insights)
    assert "987,654.32" not in text and "37%" not in text
    assert {i.category for i in insights} == {"revenue_trend", "aov_analysis"}
    assert f"{peak:,.2f}" in text  # the fallback sentence carries the real figure


@pytest.mark.parametrize("failure", [
    RuntimeError("Client.__init__() got an unexpected keyword argument 'proxies'"),
    "this is not json",
])
def test_narrator_falls_back_to_mock_on_any_failure(monkeypatch, evidence_results, failure):
    insights = narrate(monkeypatch, evidence_results, FakeAnthropic(failure, failure))
    assert len(insights) == len(evidence_results)


@pytest.mark.parametrize("confidence, expected", [(90, 0.9), ("high", 0.85), (1.7, 0.017), (-2, 0.0), (None, 0.85)])
def test_narrator_confidence_is_always_a_valid_probability(confidence, expected):
    raw = json.dumps({"insights": [{"template_used": "t", "text": "x", "confidence": confidence}]})
    (ins,) = narrator._parse_narrator_response(raw)
    assert ins["confidence"] == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Awkward files
# ---------------------------------------------------------------------------

@pytest.fixture
def base():
    return pd.read_csv(SAMPLE_PATH)


def upload(client, df=None, raw=None, name="t.csv"):
    content = raw if raw is not None else df.to_csv(index=False).encode()
    return client.post("/api/upload", files={"file": (name, content)})


def full_run(client):
    """Every endpoint a visitor hits after uploading; none may 500."""
    codes = [client.post("/api/insights").status_code, client.post("/api/evidence").status_code]
    for q in ("How did revenue change month by month?", "Which region brings in the most revenue?",
              "How much revenue comes from repeat customers?"):
        codes.append(client.post("/api/coach/ask", json={"question": q}).status_code)
    return codes


@pytest.mark.parametrize("mutate", [
    lambda d: d.head(200).assign(total_amount=0),
    lambda d: d.head(200).assign(total_amount=np.nan),
    lambda d: pd.concat([d[d.order_date < "2024-02-01"].assign(total_amount=0), d[d.order_date >= "2024-02-01"]]),
    lambda d: d.head(100).assign(total_amount=[np.inf] + list(d.total_amount[1:100])),
    lambda d: d.head(100).assign(total_amount=1e308),
    lambda d: d.head(200).assign(order_date="not a date"),
    lambda d: d.head(1),
], ids=["zero_revenue", "missing_revenue", "growth_from_zero", "infinity", "overflow", "bad_dates", "one_row"])
def test_awkward_numbers_never_cause_a_500(client, base, mutate):
    assert upload(client, mutate(base)).status_code == 200
    assert all(code < 500 for code in full_run(client))


def test_growth_from_a_zero_month_is_blank_not_infinite(client, base):
    df = pd.concat([base[base.order_date < "2024-02-01"].assign(total_amount=0), base[base.order_date >= "2024-02-01"]])
    upload(client, df)
    results = client.post("/api/evidence").json()["results"]
    trend = next(r for r in results if r["template"] == "revenue_trend")["evidence"]["data"]
    assert trend[1]["growth_pct"] is None


def test_currency_text_is_summed_as_numbers(base):
    df = base.head(300)
    as_text = df.assign(total_amount=df.total_amount.map(lambda v: f"${v:,.2f}"))
    _, parsed = profile_csv(as_text.to_csv(index=False).encode(), "t.csv")
    assert parsed["total_amount"].sum() == pytest.approx(df.total_amount.sum())


def test_product_names_with_commas_stay_text():
    raw = b'product,amount\n"Cable, 2m",5\n"Stand, large",7\n'
    _, parsed = profile_csv(raw, "t.csv")
    assert parsed["product"].tolist() == ["Cable, 2m", "Stand, large"]


@pytest.mark.parametrize("encoding", ["gbk", "cp1252", "utf-8-sig"])
def test_excel_style_encodings_are_read(base, encoding):
    df = base.head(50).rename(columns={"region": "地区" if encoding == "gbk" else "région"})
    profile, _ = profile_csv(df.to_csv(index=False).encode(encoding), "t.csv")
    assert profile.column_count == len(df.columns)
    assert ("地区" if encoding == "gbk" else "région") in [c.name for c in profile.columns]


def test_semicolon_delimited_file_is_split_into_columns(base):
    raw = base.head(50).to_csv(index=False, sep=";").encode()
    profile, _ = profile_csv(raw, "t.csv")
    assert profile.column_count == len(base.columns)


def test_binary_file_named_csv_is_rejected(client):
    assert upload(client, raw=b"PK\x03\x04\x00\x00" + bytes(range(256)) * 4).status_code == 422


def test_question_with_no_matching_rows_gets_an_answer_not_a_crash(client, base):
    profile = upload(client, base.head(300)).json()["profile"]
    overrides = [{"name": c["name"], "semantic_role": "date"} for c in profile["columns"][:3]]
    client.post("/api/update-roles", json={"overrides": overrides})
    r = client.post("/api/coach/ask", json={"question": "How did revenue change month by month?"})
    assert r.status_code == 200


@pytest.mark.parametrize("fmt", ["%d/%m/%Y", "%m/%d/%Y", "%d.%m.%Y", "%Y-%m-%d"])
def test_monthly_revenue_is_complete_whatever_the_date_format(client, base, fmt):
    df = base.assign(order_date=pd.to_datetime(base.order_date).dt.strftime(fmt))
    profile = upload(client, df).json()["profile"]
    assert (profile["date_range"]["start"], profile["date_range"]["end"]) == ("2024-01-01", "2024-06-30")
    results = client.post("/api/evidence").json()["results"]
    trend = next(r for r in results if r["template"] == "revenue_trend")["evidence"]["data"]
    assert sum(row["revenue"] for row in trend) == pytest.approx(kept(base).total_amount.sum(), abs=0.05)


def test_unreadable_dates_are_flagged(client, base):
    df = base.head(100).copy()
    df.loc[:9, "order_date"] = "sometime in spring"
    flags = upload(client, df).json()["profile"]["health_flags"]
    assert any(f["issue"] == "unparsed_dates" and "10 of 100" in f["detail"] for f in flags)


def test_file_with_headers_but_no_rows_is_rejected(client, base):
    assert upload(client, base.head(0)).status_code == 400


# ---------------------------------------------------------------------------
# Revenue is net: cancelled and refunded orders are not revenue
# ---------------------------------------------------------------------------

def test_every_template_reports_net_revenue_and_says_what_it_left_out(sample_profiled):
    profile, df = sample_profiled
    reversed_orders = df[df["order_status"] != "Completed"]
    results = {r["template"]: r["evidence"] for r in run_all(df, profile)}

    trend_total = sum(row["revenue"] for row in results["revenue_trend"].data)
    assert trend_total == pytest.approx(kept(df).total_amount.sum(), abs=0.05)
    for evidence in results.values():
        assert f"{len(reversed_orders):,} orders" in evidence.description
        assert f"${reversed_orders.total_amount.sum():,.2f}" in evidence.description


def test_pip_can_still_ask_about_cancelled_and_refunded_orders(client):
    client.get("/api/sample-dataset")
    df = pd.read_csv(SAMPLE_PATH)
    from agent.query import run_query
    from models.coach import QuerySpec
    from routers.upload import get_current_data
    state = get_current_data()
    spec = QuerySpec(agg="sum", metric_column="total_amount", group_by=["order_status"])
    rows = {r["order_status"]: r["sum_total_amount"] for r in run_query(state["dataframe"], state["profile"], spec).data}
    assert rows == pytest.approx(df.groupby("order_status").total_amount.sum().round(2).to_dict())


def test_dataset_without_reversed_orders_is_untouched(base):
    from analysis.revenue_basis import net_basis
    for df in (base.drop(columns=["order_status"]), base.assign(order_status="Completed"),
               base.assign(order_status="Cancelled")):
        profile, parsed = profile_csv(df.to_csv(index=False).encode(), "t.csv")
        profile = asyncio.run(__import__("services.semantic", fromlist=["x"]).classify_columns(profile))
        basis = net_basis(parsed, profile)
        assert not basis.applied and len(basis.df) == len(parsed)
