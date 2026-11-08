import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def make_ohlc(closes, spread=0.0, start="2024-03-04 00:00", freq="15min", wick=0.0):
    """OHLC from a list of closes: open = previous close, high/low = body +/- wick."""
    c = np.asarray(closes, float)
    o = np.r_[c[0], c[:-1]]
    h = np.maximum(o, c) + wick
    l = np.minimum(o, c) - wick
    idx = pd.date_range(start, periods=len(c), freq=freq, tz="UTC", name="time")
    df = pd.DataFrame({"open": o, "high": h, "low": l, "close": c, "volume": 1.0}, index=idx)
    if spread:
        df["spread"] = spread
    return df


def frame(rows, start="2024-03-04 00:00", freq="15min"):
    """Explicit OHLC rows [(o,h,l,c), ...]."""
    a = np.asarray(rows, float)
    idx = pd.date_range(start, periods=len(a), freq=freq, tz="UTC", name="time")
    return pd.DataFrame({"open": a[:, 0], "high": a[:, 1], "low": a[:, 2], "close": a[:, 3], "volume": 1.0}, index=idx)


@pytest.fixture
def random_walk():
    rng = np.random.default_rng(7)
    n = 3000
    c = 2000 + np.cumsum(rng.normal(0, 1.5, n))
    o = np.r_[c[0], c[:-1]]
    h = np.maximum(o, c) + rng.exponential(0.8, n)
    l = np.minimum(o, c) - rng.exponential(0.8, n)
    idx = pd.date_range("2024-01-01", periods=n, freq="15min", tz="UTC", name="time")
    return pd.DataFrame({"open": o, "high": h, "low": l, "close": c, "volume": 1.0}, index=idx)


SMC = {"swing_length": 2, "atr_period": 14, "displacement_atr": 1.2, "fvg_min_atr": 0.0, "equal_level_atr": 0.1,
       "ob_lookback": 10, "zone_max_age": 300, "ote": [0.62, 0.79]}
SESS = {"asia": ["20:00", "00:00"], "london": ["02:00", "05:00"], "ny_am": ["07:00", "10:00"],
        "ny_pm": ["13:30", "16:00"], "silver_bullet": ["10:00", "11:00"]}
