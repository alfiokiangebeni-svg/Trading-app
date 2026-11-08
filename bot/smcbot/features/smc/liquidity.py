"""Liquidity: equal highs/lows, session / day / week extremes, sweeps; premium-discount and OTE."""
from __future__ import annotations

import numpy as np
import pandas as pd
from numba import njit

NAN = np.nan


@njit(cache=True)
def equal_levels(sh_price, sl_price, atr_, tol_atr, max_keep):
    """Equal highs / lows: a newly confirmed swing within ``tol_atr * ATR`` of an earlier untaken one.

    Returns per bar the most recent active equal-high and equal-low levels (pools of resting liquidity),
    known at the confirmation bar of the second swing. The caller marks them taken via ``sweeps``.
    """
    n = len(sh_price)
    eqh = np.full(n, NAN)
    eql = np.full(n, NAN)
    hs = np.full(max_keep, NAN)
    ls = np.full(max_keep, NAN)
    hi_n, lo_n = 0, 0
    cur_h, cur_l = NAN, NAN
    for t in range(n):
        p = sh_price[t]
        if not np.isnan(p):
            for j in range(min(hi_n, max_keep)):
                if abs(hs[j] - p) <= tol_atr * atr_[t]:
                    cur_h = max(hs[j], p)
                    break
            hs[hi_n % max_keep] = p
            hi_n += 1
        p = sl_price[t]
        if not np.isnan(p):
            for j in range(min(lo_n, max_keep)):
                if abs(ls[j] - p) <= tol_atr * atr_[t]:
                    cur_l = min(ls[j], p)
                    break
            ls[lo_n % max_keep] = p
            lo_n += 1
        eqh[t] = cur_h
        eql[t] = cur_l
    return eqh, eql


@njit(cache=True)
def sweeps(high, low, close, level_hi, level_lo):
    """Liquidity sweep against levels known *before* the bar (level arrays are shifted by one bar).

    Sweep of highs (bearish, -1): high[t] > level and close[t] < level (wick beyond, close back inside).
    Sweep of lows  (bullish, +1): low[t]  < level and close[t] > level.
    A level is consumed once traded through, so it is not swept twice.
    """
    n = len(close)
    out = np.zeros(n, np.int8)
    lvl = np.full(n, NAN)
    taken_h, taken_l = NAN, NAN
    for t in range(1, n):
        lh, ll = level_hi[t - 1], level_lo[t - 1]
        if not np.isnan(lh) and lh != taken_h and high[t] > lh:
            taken_h = lh
            if close[t] < lh:
                out[t], lvl[t] = -1, lh
        if not np.isnan(ll) and ll != taken_l and low[t] < ll:
            taken_l = ll
            if close[t] > ll and out[t] == 0:
                out[t], lvl[t] = 1, ll
    return out, lvl


def period_extremes(df: pd.DataFrame, key: pd.Series) -> tuple[np.ndarray, np.ndarray]:
    """High / low of the last *completed* period (day, week, session...) known at each bar.

    ``key`` labels the period of each bar (NaN = bar outside any period). The extremes of a period
    become available from the bar after its last bar.
    """
    k = key.to_numpy()
    valid = pd.notna(k)
    g = pd.DataFrame({"k": k[valid], "h": df["high"].to_numpy()[valid], "l": df["low"].to_numpy()[valid],
                      "pos": np.nonzero(valid)[0]})
    agg = g.groupby("k", sort=False).agg(h=("h", "max"), l=("l", "min"), end=("pos", "max")).sort_values("end")
    hi = np.full(len(df), np.nan)
    lo = np.full(len(df), np.nan)
    start = agg["end"].to_numpy().astype(np.int64) + 1  # first bar that knows the completed period
    keep = start < len(df)
    hi[start[keep]] = agg["h"].to_numpy()[keep]
    lo[start[keep]] = agg["l"].to_numpy()[keep]
    hi = pd.Series(hi).ffill().to_numpy()
    lo = pd.Series(lo).ffill().to_numpy()
    return hi, lo


@njit(cache=True)
def premium_discount(close, last_sh, last_sl, ote_lo, ote_hi):
    """Position of price in the dealing range (last confirmed swing low -> high), 0 = low, 1 = high.

    discount: pos < 0.5, premium: pos > 0.5.
    OTE long : retracement of 62-79 % from the high  -> pos in [1 - ote_hi, 1 - ote_lo]
    OTE short: pos in [ote_lo, ote_hi]
    """
    n = len(close)
    pos = np.full(n, NAN)
    ote_long = np.zeros(n, np.int8)
    ote_short = np.zeros(n, np.int8)
    for t in range(n):
        h, l = last_sh[t], last_sl[t]
        if np.isnan(h) or np.isnan(l) or h <= l:
            continue
        p = (close[t] - l) / (h - l)
        pos[t] = p
        if 1 - ote_hi <= p <= 1 - ote_lo:
            ote_long[t] = 1
        if ote_lo <= p <= ote_hi:
            ote_short[t] = 1
    return pos, ote_long, ote_short
