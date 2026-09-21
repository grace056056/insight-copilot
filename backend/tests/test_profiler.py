"""Stage 1: deterministic profiling (pandas only)."""

import io

import pandas as pd
import pytest

from models.schemas import DType
from services.profiler import UnparsableTableError, profile_csv


def _cols(profile):
    return {c.name: c for c in profile.columns}


def test_sample_dataset_shape(sample_bytes):
    profile, df = profile_csv(sample_bytes, "sample_ecommerce.csv")
    assert profile.row_count == len(df) == 3500
    assert profile.column_count == 12
    assert [c.name for c in profile.columns] == list(df.columns)


def test_dtype_detection_on_sample(sample_bytes):
    profile, _ = profile_csv(sample_bytes, "sample_ecommerce.csv")
    cols = _cols(profile)
    assert cols["order_date"].dtype == DType.DATETIME
    assert cols["total_amount"].dtype == DType.NUMERIC
    assert cols["category"].dtype == DType.CATEGORICAL


def test_date_range_matches_pandas(sample_bytes):
    profile, df = profile_csv(sample_bytes, "sample_ecommerce.csv")
    dates = pd.to_datetime(df["order_date"])
    assert profile.date_range is not None
    assert profile.date_range.start.startswith(str(dates.min().date()))
    assert profile.date_range.end.startswith(str(dates.max().date()))


def test_null_rate_and_numeric_stats_are_exact():
    csv = b"id,amount\n1,10\n2,\n3,30\n4,\n"
    profile, _ = profile_csv(csv, "nulls.csv")
    stats = _cols(profile)["amount"].stats
    assert stats.total_count == 4
    assert stats.nullable_pct == 50.0
    assert stats.min == 10 and stats.max == 30 and stats.mean == 20


def test_tsv_is_parsed_like_csv():
    tsv = b"order_id\tamount\nA1\t10.5\nA2\t20.0\n"
    profile, df = profile_csv(tsv, "orders.tsv")
    assert list(df.columns) == ["order_id", "amount"]
    assert profile.row_count == 2


def test_xlsx_upload_is_parsed():
    buf = io.BytesIO()
    pd.DataFrame({"order_id": ["A1", "A2"], "amount": [10.5, 20.0]}).to_excel(buf, index=False)
    profile, df = profile_csv(buf.getvalue(), "orders.xlsx")
    assert profile.row_count == 2
    assert df["amount"].sum() == pytest.approx(30.5)


def test_corrupt_xlsx_raises_clean_error():
    with pytest.raises(UnparsableTableError):
        profile_csv(b"this is not a workbook", "broken.xlsx")
