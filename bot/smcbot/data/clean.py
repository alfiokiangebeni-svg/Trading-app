"""Cleaning and multi-timeframe aggregation of M1 data (everything in UTC)."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

TF_MINUTES = {"M1": 1, "M5": 5, "M15": 15, "M30": 30, "H1": 60, "H4": 240, "D1": 1440}


@dataclass
class CleanReport:
    rows_in: int = 0
    duplicates: int = 0
    invalid: int = 0
    ohlc_fixed: int = 0
    weekend_dropped: int = 0
    rows_out: int = 0
    gaps: list[tuple[str, str, float]] = field(default_factory=list)  # (from, to, hours) > threshold

    def summary(self) -> str:
        g = ", ".join(f"{a} -> {b} ({h:.1f} h)" for a, b, h in self.gaps[:8])
        more = f" (+{len(self.gaps) - 8} more)" if len(self.gaps) > 8 else ""
        return (f"{self.rows_in:,} rows in, {self.duplicates:,} duplicates, {self.invalid:,} invalid, "
                f"{self.ohlc_fixed:,} OHLC fixed, {self.weekend_dropped:,} weekend bars dropped, "
                f"{self.rows_out:,} rows out. Unusual gaps: {len(self.gaps)}{(': ' + g + more) if g else ''}")


def clean_m1(df: pd.DataFrame, market: str = "24/7", gap_hours: float = 3.0) -> tuple[pd.DataFrame, CleanReport]:
    """Sort, dedupe, drop invalid prices, repair OHLC, drop weekend bars for FX/metals, report gaps.

    market: "24/7" (crypto) or "fx" (metals: closed from Friday 22:00 to Sunday 22:00 UTC, roughly).
    Gaps are reported, never filled: inventing prices would create fake signals.
    """
    rep = CleanReport(rows_in=len(df))
    if df.index.tz is None:
        df = df.tz_localize("UTC")
    else:
        df = df.tz_convert("UTC")
    df = df.sort_index()
    dup = df.index.duplicated(keep="last")
    rep.duplicates = int(dup.sum())
    df = df[~dup]
    px = df[["open", "high", "low", "close"]]
    bad = px.isna().any(axis=1) | (px <= 0).any(axis=1)
    rep.invalid = int(bad.sum())
    df = df[~bad].copy()
    hi = df[["open", "high", "low", "close"]].max(axis=1)
    lo = df[["open", "high", "low", "close"]].min(axis=1)
    fix = (df["high"] < hi) | (df["low"] > lo)
    rep.ohlc_fixed = int(fix.sum())
    df["high"], df["low"] = hi, lo
    if market == "fx":
        wd, hr = df.index.dayofweek, df.index.hour
        weekend = (wd == 5) | ((wd == 4) & (hr >= 22)) | ((wd == 6) & (hr < 21))
        rep.weekend_dropped = int(weekend.sum())
        df = df[~weekend]
    if "volume" not in df:
        df["volume"] = 0.0
    dt = df.index.to_series().diff().dt.total_seconds().div(3600)
    for t, h in dt[dt > gap_hours].items():
        prev = df.index[df.index.get_loc(t) - 1]
        if market == "fx" and prev.dayofweek >= 4 and t.dayofweek in (6, 0) and h < 60:
            continue  # normal weekend close
        rep.gaps.append((str(prev), str(t), float(h)))
    rep.rows_out = len(df)
    return df, rep


def resample(df: pd.DataFrame, tf: str, daily_close_utc_hour: int = 0) -> pd.DataFrame:
    """Aggregate M1 to a higher timeframe. Index = bar open time; `close_time` = when the bar is known.

    D1 bars close at `daily_close_utc_hour` (22 = 17:00 New York for metals, 0 for crypto).
    """
    m = TF_MINUTES[tf]
    if m == 1:
        out = df.copy()
    else:
        offset = pd.Timedelta(hours=daily_close_utc_hour) if tf == "D1" else pd.Timedelta(0)
        agg = {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"}
        if "spread" in df:
            agg["spread"] = "mean"
        out = df.resample(f"{m}min", offset=offset, label="left", closed="left").agg(agg)
        out = out.dropna(subset=["open"])
    out["close_time"] = out.index + pd.Timedelta(minutes=m)
    return out


def split_periods(index: pd.DatetimeIndex, in_sample: float = 0.6, validation: float = 0.2) -> dict[str, slice]:
    """Chronological 60/20/20 split by time. The `test` slice is meant to be used only once."""
    t0, t1 = index[0], index[-1]
    a = t0 + (t1 - t0) * in_sample
    b = t0 + (t1 - t0) * (in_sample + validation)
    return {"in_sample": slice(t0, a), "validation": slice(a, b), "test": slice(b, t1)}


def to_numpy(df: pd.DataFrame) -> dict[str, np.ndarray]:
    return {c: df[c].to_numpy(np.float64) for c in ("open", "high", "low", "close")}
