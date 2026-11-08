"""Cross-check against the `smartmoneyconcepts` library (skipped if it is not installed).

The library labels an FVG on the *middle* candle, using the next candle: in a backtest that is one bar
of look-ahead. Our events are dated on the third candle. Same gaps, one bar later.
"""
import numpy as np
import pytest

smc_lib = pytest.importorskip("smartmoneyconcepts.smc")

from smcbot.features.smc import zones  # noqa: E402


def test_same_fvgs_as_library_one_bar_later(random_walk):
    df = random_walk.iloc[:1500]
    lib = smc_lib.smc.fvg(df[["open", "high", "low", "close", "volume"]])["FVG"].to_numpy()
    h, l, o, c = (df[k].to_numpy() for k in ("high", "low", "open", "close"))
    t, d, _, _ = zones.fvg_events(h, l, np.ones(len(df)), 0.0)
    # the library also requires the middle candle to close in the gap direction
    mid = t - 1
    keep = np.where(d > 0, c[mid] > o[mid], c[mid] < o[mid])
    ours = np.zeros(len(df))
    ours[mid[keep]] = d[keep]
    lib = np.nan_to_num(lib)
    assert (ours[:-1] == lib[:-1]).all()
