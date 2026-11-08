"""No look-ahead: every feature at bar t must be identical whether or not later bars exist.

We compute all features on the full series and on truncated copies; the overlapping rows must match
exactly. A detector that peeks at the future (centered swings, labels on the middle FVG candle,
period extremes before the period ends...) fails this test.
"""
import numpy as np
import pandas as pd
import pytest

from conftest import SESS, SMC
from smcbot.features.smc import align_htf, compute_features
from smcbot.data.clean import resample


@pytest.mark.parametrize("cut", [400, 1111, 2500])
def test_features_are_causal(random_walk, cut):
    full = compute_features(random_walk, SMC, SESS, 22)
    part = compute_features(random_walk.iloc[:cut], SMC, SESS, 22)
    a, b = full.iloc[:cut], part
    for col in b.columns:
        x, y = a[col].to_numpy(), b[col].to_numpy()
        if x.dtype.kind == "f":
            same = np.isclose(x, y, equal_nan=True) | (np.isnan(x) & np.isnan(y))
        else:
            same = x == y
        assert same.all(), f"look-ahead in '{col}' (first mismatch at row {np.flatnonzero(~same)[0]})"


def test_htf_alignment_uses_closed_bars_only(random_walk):
    m15 = random_walk.copy()
    m15["close_time"] = m15.index + pd.Timedelta(minutes=15)
    h1 = resample(random_walk, "H1")
    feat = pd.DataFrame({"x": h1["close"].to_numpy()}, index=h1.index)
    al = align_htf(m15, feat, h1["close_time"], ["x"], "h1_")
    # the M15 bar 10:00-10:15 must see the H1 bar 09:00-10:00, not 10:00-11:00
    t = m15.index[m15.index.get_loc(pd.Timestamp("2024-01-02 10:00", tz="UTC"))]
    assert al.loc[t, "h1_x"] == h1.loc[pd.Timestamp("2024-01-02 09:00", tz="UTC"), "close"]
    # the M15 bar 10:45-11:00 closes with the 10:00 H1 bar -> it may use it
    t2 = pd.Timestamp("2024-01-02 10:45", tz="UTC")
    assert al.loc[t2, "h1_x"] == h1.loc[pd.Timestamp("2024-01-02 10:00", tz="UTC"), "close"]
