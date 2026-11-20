"""
services/profiler.py
--------------------
Deterministic data profiler for uploaded CSV files.

This is Stage 1 of the two-stage profiling pipeline:
  Stage 1 (this file): Compute exact statistics using pandas — dtypes,
      distributions, nulls, cardinality, date detection. No LLM involved.
  Stage 2 (services/semantic.py, Day 2): Send the statistical profile to
      Claude for semantic column classification.

Why separate stages?
  LLMs are unreliable at math. They might say "average revenue is $45.20"
  when it's actually $52.80. By computing statistics deterministically first,
  we guarantee numerical accuracy. The LLM's job is narrowed to what it's
  good at: understanding meaning from context.

Interview talking point:
  "I designed a two-stage profiling pipeline that separates deterministic
  computation from LLM inference. The statistical profiling runs in pandas
  because those are exact computations you'd never trust a language model
  to do reliably."
"""

from __future__ import annotations

import io
import logging
import warnings

import numpy as np
import pandas as pd

from config import settings
from models.schemas import (
    ColumnProfile,
    ColumnStats,
    DataProfile,
    DateRange,
    DType,
    HealthFlag,
    TopValue,
)

logger = logging.getLogger(__name__)


class UnparsableTableError(ValueError):
    """Raised when an uploaded file parses without a low-level error but
    doesn't yield a standard tabular shape (e.g. an Excel sheet with no
    header row or no data rows). Caught in routers/upload.py and surfaced
    as a 400, distinct from generic parse failures."""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _read_dataframe(file_content: bytes, filename: str) -> pd.DataFrame:
    """
    Parse uploaded file bytes into a DataFrame, dispatching on extension.
    Everything downstream (profiling, health checks, evidence templates)
    operates on the returned DataFrame and never needs to know the source format.
    """
    if filename.lower().endswith(".xlsx"):
        try:
            df = pd.read_excel(
                io.BytesIO(file_content),
                nrows=settings.MAX_ROWS_FOR_PROFILING,
                engine="openpyxl",
            )
        except Exception as e:
            # openpyxl raises a wide, unpredictable range of low-level errors
            # for invalid/corrupted/non-standard workbooks (bad zip structure,
            # unexpected style objects, malformed XML, etc). None of that is
            # meaningful to an end user — log it for developers and surface a
            # single clean message instead of the raw exception text.
            logger.warning(
                "Failed to parse .xlsx file %r: %s", filename, e, exc_info=True
            )
            raise UnparsableTableError(
                "Unable to read this Excel file. Please make sure it is a "
                "standard Excel table with a header row and data rows, then "
                "try uploading again."
            ) from e
        # openpyxl/pandas happily "succeed" on a sheet with no header row or
        # no data rows (empty sheet, title-only sheet, images-only sheet),
        # returning a degenerate 0-row and/or 0-column DataFrame instead of
        # raising. Catch that here so it fails clearly at upload time rather
        # than surfacing as a confusing error deeper in the pipeline.
        if df.shape[0] == 0 or df.shape[1] == 0:
            raise UnparsableTableError(
                "Could not parse this Excel file as a standard table. "
                "Please make sure the first sheet contains a header row "
                "and row-based data."
            )
        return df
    return _read_delimited(file_content, filename)


# Excel on Windows saves "CSV" in the local code page, not UTF-8. Try UTF-8
# first, then the common Chinese and Western European encodings.
_ALT_DELIMITERS = (";", "\t", "|")
_MONEY_CHARS = r"[$€£¥,\s]"


def _read_delimited(file_content: bytes, filename: str) -> pd.DataFrame:
    if b"\x00" in file_content[:4096]:
        raise ValueError("this looks like a binary file, not a text table")

    sep = "\t" if filename.lower().endswith(".tsv") else ","
    df, last_error = None, None
    for encoding in _encoding_order(file_content):
        try:
            df = _parse(file_content, sep, encoding)
            break
        except (UnicodeDecodeError, UnicodeError) as e:
            last_error = e
    if df is None:
        raise ValueError(f"could not decode the file as text ({last_error})")

    # A European export uses ";" between fields; read with "," it collapses
    # into one column whose header still contains the real delimiter.
    if df.shape[1] == 1:
        header = str(df.columns[0])
        for alt in _ALT_DELIMITERS:
            if alt != sep and alt in header:
                df = _parse(file_content, alt, encoding)
                break
    return df


def _encoding_order(file_content: bytes) -> tuple[str, ...]:
    """UTF-8 first. If that fails, guess between Chinese and Western text.

    Both legacy encodings accept most byte sequences, so trying them in a
    fixed order silently garbles one of them. The tell: Chinese characters
    are pairs of high bytes, while an accented Latin letter is a single high
    byte surrounded by plain ASCII.
    """
    sample = file_content[:200_000]
    high = [b >= 0x80 for b in sample]
    paired = sum(
        1 for i, h in enumerate(high)
        if h and ((i > 0 and high[i - 1]) or (i + 1 < len(high) and high[i + 1]))
    )
    mostly_pairs = sum(high) > 0 and paired / sum(high) > 0.5
    legacy = ("gb18030", "cp1252") if mostly_pairs else ("cp1252", "gb18030")
    return ("utf-8-sig",) + legacy + ("latin-1",)


def _parse(file_content: bytes, sep: str, encoding: str) -> pd.DataFrame:
    return pd.read_csv(
        io.BytesIO(file_content),
        nrows=settings.MAX_ROWS_FOR_PROFILING,
        sep=sep,
        encoding=encoding,
    )


def parse_dates(series: pd.Series) -> pd.Series:
    """Parse a text column as dates, working out whether the day comes first.

    pandas assumes month-first (US style). On a 31/01/2024-style file that
    turns every date after the 12th into a missing value, and the rows are
    silently dropped from monthly totals. Parse both ways and keep whichever
    reading makes sense of more rows; a tie keeps the pandas default.
    """
    if pd.api.types.is_datetime64_any_dtype(series):
        return series
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        month_first = pd.to_datetime(series, errors="coerce")
        day_first = pd.to_datetime(series, errors="coerce", dayfirst=True)
    return day_first if day_first.notna().sum() > month_first.notna().sum() else month_first


def _normalize_dates(df: pd.DataFrame, columns: list[ColumnProfile]) -> list[HealthFlag]:
    """Store date columns as real dates and report any rows that didn't parse."""
    flags: list[HealthFlag] = []
    for col in columns:
        series = df[col.name]
        if col.dtype != DType.DATETIME or not isinstance(series, pd.Series):
            continue
        parsed = parse_dates(series)
        unreadable = int(series.notna().sum() - parsed.notna().sum())
        df[col.name] = parsed
        if unreadable > 0:
            flags.append(HealthFlag(
                column=col.name,
                issue="unparsed_dates",
                detail=(
                    f"{unreadable:,} of {len(series):,} dates could not be read "
                    f"and are left out of time-based analysis"
                ),
                severity="warning",
            ))
    return flags


def _normalize_numbers(df: pd.DataFrame) -> pd.DataFrame:
    """Make the DataFrame agree with what the profiler will say about it.

    "$1,204.50" is detected as numeric by _detect_dtype, but the stored
    column was still text, so a template that summed it concatenated strings.
    Convert those columns for real, and treat infinities as missing values.
    """
    for col in df.columns:
        series = df[col]
        if not isinstance(series, pd.Series):  # duplicate header: leave as is
            continue
        if series.dtype == object:
            non_null = series.dropna().astype(str)
            if len(non_null) and non_null.str.contains(r"[$€£¥]|\d,\d{3}", regex=True).any():
                cleaned = series.astype("string").str.replace(_MONEY_CHARS, "", regex=True)
                converted = pd.to_numeric(cleaned, errors="coerce")
                if converted.notna().sum() == series.notna().sum():
                    df[col] = converted.astype(float)
                    series = df[col]
        if pd.api.types.is_float_dtype(series):
            df[col] = series.replace([np.inf, -np.inf], np.nan)
    return df


def profile_csv(file_content: bytes, filename: str) -> tuple[DataProfile, pd.DataFrame]:
    """
    Profile an uploaded file and return a structured DataProfile + the parsed DataFrame.

    The DataFrame is returned so downstream services (analysis templates)
    can compute against the actual data without re-parsing.

    Args:
        file_content: Raw bytes of the uploaded file (.csv, .tsv, or .xlsx).
        filename: Original filename — used to pick the parser and for display.

    Returns:
        Tuple of (DataProfile, DataFrame).
    """
    # --- Parse file (CSV/TSV or Excel) ---
    df = _normalize_numbers(_read_dataframe(file_content, filename))
    if len(df) == 0:
        raise UnparsableTableError(
            "This file has column headers but no data rows, so there is nothing to analyze."
        )

    # --- Profile each column ---
    columns: list[ColumnProfile] = []
    for col_name in df.columns:
        col_profile = _profile_column(df[col_name], col_name, len(df))
        columns.append(col_profile)

    # --- Parse date columns once, so every analysis reads them the same way ---
    date_flags = _normalize_dates(df, columns)

    # --- Detect date range ---
    date_range = _detect_date_range(df, columns)

    # --- Detect data quality issues ---
    health_flags = _detect_health_flags(df, columns) + date_flags

    # --- Build the profile ---
    profile = DataProfile(
        filename=filename,
        row_count=len(df),
        column_count=len(df.columns),
        date_range=date_range,
        grain=None,     # Set by semantic profiler in Day 2
        summary=None,   # Set by semantic profiler in Day 2
        columns=columns,
        health_flags=health_flags,
    )

    return profile, df


# ---------------------------------------------------------------------------
# Column profiling
# ---------------------------------------------------------------------------

def _profile_column(series: pd.Series, name: str, total_rows: int) -> ColumnProfile:
    """
    Compute the statistical profile of a single column.

    Detection priority:
      1. Try to parse as datetime
      2. Check if already numeric
      3. Check if it looks like an identifier (high cardinality + non-numeric)
      4. Default to categorical (or text if values are long)
    """
    dtype = _detect_dtype(series, name)
    stats = _compute_stats(series, dtype, total_rows)

    # Heuristic: dimensions group data, measures are aggregatable
    is_dimension = dtype in (DType.CATEGORICAL, DType.DATETIME, DType.IDENTIFIER)
    is_measure = dtype == DType.NUMERIC

    return ColumnProfile(
        name=name,
        dtype=dtype,
        stats=stats,
        is_dimension=is_dimension,
        is_measure=is_measure,
    )


def _detect_dtype(series: pd.Series, name: str) -> DType:
    """
    Determine the data type of a column using heuristics.

    This goes beyond pandas dtype detection — a column stored as 'object'
    might actually be dates, identifiers, or numeric strings.

    Detection order matters:
      1. Numeric FIRST — prevents integers (1, 2, 3) from being parsed as dates
      2. Datetime second — only for non-numeric columns
      3. Identifier — high cardinality or ID-like column names
      4. Text vs categorical — based on average string length
    """
    # Drop nulls for analysis
    non_null = series.dropna()
    if len(non_null) == 0:
        return DType.TEXT

    # --- Check for numeric FIRST ---
    # This must come before datetime, because pd.to_datetime will happily
    # parse integers like 1, 2, 3 as timestamps (a common profiling bug).
    if pd.api.types.is_numeric_dtype(series):
        return DType.NUMERIC

    # Try converting string values to numeric
    if non_null.dtype == object:
        cleaned = non_null.astype(str).str.replace(r"[$€£,]", "", regex=True).str.strip()
        try:
            pd.to_numeric(cleaned, errors="raise")
            return DType.NUMERIC
        except (ValueError, TypeError):
            pass

    # --- Check for datetime (only for non-numeric columns) ---
    if _looks_like_dates(non_null, name):
        return DType.DATETIME

    # --- Check for identifier ---
    # High cardinality (>80% unique) + short values = likely an ID column
    unique_ratio = non_null.nunique() / len(non_null) if len(non_null) > 0 else 0
    name_lower = name.lower()
    id_keywords = ["id", "code", "key", "sku", "number", "num", "no"]

    if unique_ratio > 0.8 or any(kw in name_lower for kw in id_keywords):
        return DType.IDENTIFIER

    # --- Check for text vs categorical ---
    # If average string length > 50, treat as text; otherwise categorical
    avg_len = non_null.astype(str).str.len().mean()
    if avg_len > 50:
        return DType.TEXT

    return DType.CATEGORICAL


def _looks_like_dates(series: pd.Series, name: str) -> bool:
    """
    Heuristic check for datetime columns.
    Checks the column name and tries parsing a sample of values.
    """
    name_lower = name.lower()
    date_keywords = ["date", "time", "created", "updated", "timestamp", "day", "month", "year"]

    # Strong signal: column name contains a date keyword
    name_match = any(kw in name_lower for kw in date_keywords)

    # Try parsing a sample
    sample = series.dropna().head(20)
    if len(sample) == 0:
        return False

    try:
        parsed = pd.to_datetime(sample, format="mixed", dayfirst=False)
        # If parsing succeeded for >80% of the sample, it's likely dates
        success_rate = parsed.notna().sum() / len(sample)
        if success_rate > 0.8:
            return True
    except (ValueError, TypeError):
        pass

    # Fallback: trust the column name if it strongly suggests dates
    return name_match and series.dtype == object


def _compute_stats(series: pd.Series, dtype: DType, total_rows: int) -> ColumnStats:
    """Compute appropriate statistics based on the detected dtype."""
    null_count = series.isna().sum()
    nullable_pct = round((null_count / total_rows) * 100, 1) if total_rows > 0 else 0
    non_null = series.dropna()
    unique_count = int(non_null.nunique())

    # Base stats present for all dtypes
    stats_kwargs = {
        "nullable_pct": nullable_pct,
        "unique_count": unique_count,
        "total_count": total_rows,
    }

    if dtype == DType.NUMERIC:
        # For numeric columns: compute min, max, mean, median, std
        numeric_vals = pd.to_numeric(
            non_null.astype(str).str.replace(r"[$€£,]", "", regex=True),
            errors="coerce",
        ).dropna()

        if len(numeric_vals) > 0:
            stats_kwargs.update({
                "min": round(float(numeric_vals.min()), 2),
                "max": round(float(numeric_vals.max()), 2),
                "mean": round(float(numeric_vals.mean()), 2),
                "median": round(float(numeric_vals.median()), 2),
                "std": round(float(numeric_vals.std()), 2) if len(numeric_vals) > 1 else 0,
            })

    if dtype in (DType.CATEGORICAL, DType.TEXT, DType.IDENTIFIER):
        # For categorical columns: compute top values
        value_counts = non_null.value_counts().head(5)
        stats_kwargs["top_values"] = [
            TopValue(
                value=str(val),
                count=int(count),
                percentage=round((count / total_rows) * 100, 1),
            )
            for val, count in value_counts.items()
        ]

    return ColumnStats(**stats_kwargs)


# ---------------------------------------------------------------------------
# Date range detection
# ---------------------------------------------------------------------------

def _detect_date_range(
    df: pd.DataFrame, columns: list[ColumnProfile]
) -> DateRange | None:
    """
    Find the first datetime column and compute the dataset's date range.
    Returns None if no datetime column exists.
    """
    date_cols = [c for c in columns if c.dtype == DType.DATETIME]
    if not date_cols:
        return None

    col_name = date_cols[0].name
    try:
        dates = pd.to_datetime(df[col_name], format="mixed", errors="coerce").dropna()
        if len(dates) == 0:
            return None

        start = dates.min()
        end = dates.max()
        return DateRange(
            start=start.strftime("%Y-%m-%d"),
            end=end.strftime("%Y-%m-%d"),
            span_days=int((end - start).days),
        )
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Data quality checks
# ---------------------------------------------------------------------------

def _detect_health_flags(
    df: pd.DataFrame, columns: list[ColumnProfile]
) -> list[HealthFlag]:
    """
    Scan for data quality issues that might affect analysis accuracy.
    These flags are shown to the user in the Data Profile panel.
    """
    flags: list[HealthFlag] = []

    for col in columns:
        # High null percentage
        if col.stats.nullable_pct > 20:
            flags.append(HealthFlag(
                column=col.name,
                issue="high_nulls",
                detail=f"{col.stats.nullable_pct}% of values are missing",
                severity="warning" if col.stats.nullable_pct > 50 else "info",
            ))

        # Single value (no variance — useless for analysis)
        if col.stats.unique_count <= 1 and col.stats.total_count > 1:
            flags.append(HealthFlag(
                column=col.name,
                issue="single_value",
                detail="Column contains only one unique value",
                severity="warning",
            ))

        # Extreme low cardinality for something that looks like an ID
        if col.dtype == DType.IDENTIFIER and col.stats.unique_count < 5:
            flags.append(HealthFlag(
                column=col.name,
                issue="low_cardinality",
                detail=(
                    f"Detected as identifier but has only "
                    f"{col.stats.unique_count} unique values"
                ),
                severity="info",
            ))

        # Numeric outliers (values > 3 std from mean)
        if col.dtype == DType.NUMERIC and col.stats.std and col.stats.mean:
            if col.stats.max and col.stats.max > col.stats.mean + 3 * col.stats.std:
                flags.append(HealthFlag(
                    column=col.name,
                    issue="outliers",
                    detail=(
                        f"Max value ({col.stats.max}) is more than 3 standard "
                        f"deviations from the mean ({col.stats.mean})"
                    ),
                    severity="info",
                ))

    return flags
