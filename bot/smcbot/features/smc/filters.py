"""Context filters: volatility regime, day of week, high-impact news blackout."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


def atr_percentile(atr_: np.ndarray, window: int = 500) -> np.ndarray:
    """Rank of the current ATR among the previous ``window`` bars (0..1), causal."""
    s = pd.Series(atr_)
    return s.rolling(window, min_periods=50).rank(pct=True).to_numpy()


def news_blackout(index: pd.DatetimeIndex, calendar_csv: str | Path | None, minutes: int = 30,
                  impact: str = "High", currencies: tuple[str, ...] = ("USD",)) -> np.ndarray:
    """True for bars within ±``minutes`` of a high-impact event.

    The calendar is a CSV with columns time (UTC), currency, impact (e.g. an export from
    ForexFactory / Investing). No file -> no blackout (and the report says the filter was off).
    """
    out = np.zeros(len(index), bool)
    if not calendar_csv or not Path(calendar_csv).exists():
        return out
    cal = pd.read_csv(calendar_csv)
    cal["time"] = pd.to_datetime(cal["time"], utc=True)
    cal = cal[(cal["impact"].str.lower() == impact.lower()) & cal["currency"].isin(currencies)]
    t = index.as_unit("ns").asi8
    w = minutes * 60 * 10**9
    ev = np.sort(cal["time"].dt.as_unit("ns").astype("int64").to_numpy())
    lo = np.searchsorted(ev, t - w, side="left")
    hi = np.searchsorted(ev, t + w, side="right")
    out[hi > lo] = True
    return out
