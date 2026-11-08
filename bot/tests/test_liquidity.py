"""Sweeps, equal levels, completed-period extremes, premium/discount, sessions (DST)."""
import numpy as np
import pandas as pd

from smcbot.features.smc import liquidity, sessions


def test_sweep_of_highs_and_lows():
    h = np.array([10, 10, 12.5, 10, 10]); l = np.array([8, 8, 8, 6.5, 8]); c = np.array([9, 9, 11, 7.5, 9])
    lvl_h = np.full(5, 12.0); lvl_l = np.full(5, 7.0)
    s, lvl = liquidity.sweeps(h, l, c, lvl_h, lvl_l)
    assert list(s) == [0, 0, -1, 1, 0] and lvl[2] == 12 and lvl[3] == 7


def test_level_broken_is_not_a_sweep_and_not_reused():
    h = np.array([10, 13, 13]); l = np.array([8, 8, 8]); c = np.array([9, 12.8, 11])
    s, _ = liquidity.sweeps(h, l, c, np.full(3, 12.0), np.full(3, np.nan))
    assert not s.any()   # bar 1 closes above (break), bar 2 cannot sweep the consumed level


def test_equal_highs():
    sh = np.array([np.nan, 100.0, np.nan, np.nan, 100.05, np.nan]); sl = np.full(6, np.nan)
    eqh, _ = liquidity.equal_levels(sh, sl, np.full(6, 1.0), 0.1, 20)
    assert np.isnan(eqh[3]) and eqh[4] == 100.05


def test_period_extremes_only_after_period_end():
    idx = pd.date_range("2024-03-04", periods=6, freq="4h", tz="UTC")
    df = pd.DataFrame({"high": [1, 5, 2, 3, 9, 4.0], "low": [0, -1, 0, 1, 2, 0.5]}, index=idx)
    key = pd.Series(["a", "a", "a", "b", "b", "b"], index=idx)
    hi, lo = liquidity.period_extremes(df, key)
    assert np.isnan(hi[:3]).all() and (hi[3:] == 5).all() and (lo[3:] == -1).all()


def test_premium_discount_and_ote():
    c = np.array([100.0, 130, 175]); h = np.full(3, 200.0); l = np.full(3, 100.0)
    pos, ol, os_ = liquidity.premium_discount(c, h, l, 0.62, 0.79)
    assert np.allclose(pos, [0, 0.3, 0.75]) and list(ol) == [0, 1, 0] and list(os_) == [0, 0, 1]


def test_kill_zone_follows_new_york_dst():
    sess = {"ny_am": ["07:00", "10:00"]}
    winter = pd.DatetimeIndex(["2024-01-10 12:00", "2024-01-10 11:00"], tz="UTC")   # EST = UTC-5
    summer = pd.DatetimeIndex(["2024-07-10 11:00", "2024-07-10 10:00"], tz="UTC")   # EDT = UTC-4
    assert list(sessions.session_flags(winter, sess)["ny_am"]) == [True, False]
    assert list(sessions.session_flags(summer, sess)["ny_am"]) == [True, False]


def test_asia_session_crosses_midnight():
    idx = pd.DatetimeIndex(["2024-01-10 01:00", "2024-01-10 04:59", "2024-01-10 05:00"], tz="UTC")  # 20:00, 23:59, 00:00 NY
    assert list(sessions.session_flags(idx, {"asia": ["20:00", "00:00"]})["asia"]) == [True, True, False]
