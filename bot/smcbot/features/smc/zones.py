"""Zone detectors: Fair Value Gaps, Inverse FVG, Balanced Price Range, Order Blocks, Breaker blocks.

Each detector returns *creation events* (bar index where the zone becomes known, direction, top,
bottom, plus quality flags). ``core.track_zones`` then follows them through time.
"""
from __future__ import annotations

import numpy as np
from numba import njit

NAN = np.nan


@njit(cache=True)
def fvg_events(high, low, atr_, min_atr):
    """3-candle Fair Value Gaps, known at the close of the third candle ``t``.

    Bullish: low[t] > high[t-2]  -> zone [high[t-2], low[t]]
    Bearish: high[t] < low[t-2]  -> zone [high[t], low[t-2]]
    Gaps smaller than ``min_atr * ATR[t]`` are ignored.
    """
    n = len(high)
    t_ = np.empty(n, np.int64)
    d_ = np.empty(n, np.int8)
    top = np.empty(n)
    bot = np.empty(n)
    k = 0
    for t in range(2, n):
        if low[t] > high[t - 2] and low[t] - high[t - 2] >= min_atr * atr_[t]:
            t_[k], d_[k], top[k], bot[k] = t, 1, low[t], high[t - 2]
            k += 1
        elif high[t] < low[t - 2] and low[t - 2] - high[t] >= min_atr * atr_[t]:
            t_[k], d_[k], top[k], bot[k] = t, -1, low[t - 2], high[t]
            k += 1
    return t_[:k], d_[:k], top[:k], bot[:k]


@njit(cache=True)
def ifvg_events(inval_dir, inval_top, inval_bot):
    """Inverse FVG: an FVG closed through flips polarity (bullish FVG broken -> bearish IFVG)."""
    idx = np.nonzero(inval_dir)[0]
    return idx.astype(np.int64), (-inval_dir[idx]).astype(np.int8), inval_top[idx], inval_bot[idx]


@njit(cache=True)
def bpr_events(f_t, f_dir, f_top, f_bot, max_gap):
    """Balanced Price Range: overlap of a bearish and a bullish FVG created within ``max_gap`` bars.

    The BPR takes the direction of the most recent FVG and is known when that FVG is.
    """
    m = len(f_t)
    t_ = np.empty(m, np.int64)
    d_ = np.empty(m, np.int8)
    top = np.empty(m)
    bot = np.empty(m)
    k = 0
    for j in range(m):
        for i in range(j - 1, -1, -1):
            if f_t[j] - f_t[i] > max_gap:
                break
            if f_dir[i] != f_dir[j]:
                lo, hi = max(f_bot[i], f_bot[j]), min(f_top[i], f_top[j])
                if hi > lo:
                    t_[k], d_[k], top[k], bot[k] = f_t[j], f_dir[j], hi, lo
                    k += 1
                    break
    return t_[:k], d_[:k], top[:k], bot[:k]


@njit(cache=True)
def order_block_events(open_, high, low, close, atr_, brk_dir, brk_pivot, last_sl, last_sh,
                       fvg_t, fvg_dir, lookback, disp_k):
    """Order blocks created by structure breaks (BOS / CHoCH), known at the breaking bar ``t``.

    Bullish break at t: take the lowest low between the broken swing pivot and t (origin of the leg),
    then the last bearish candle at or up to ``lookback`` bars before that origin. Zone = its high/low.

    Quality flags (0/1):
      liq  : the leg origin swept liquidity (went below the last swing low known before it)
      fvg  : the displacement leg left an FVG in the break direction (created in ]ob, t])
      disp : at least one displacement candle (body >= disp_k * ATR) in ]ob, t]
    """
    n = len(close)
    t_ = np.empty(n, np.int64)
    d_ = np.empty(n, np.int8)
    top = np.empty(n)
    bot = np.empty(n)
    liq = np.zeros(n, np.int8)
    has_fvg = np.zeros(n, np.int8)
    disp = np.zeros(n, np.int8)
    k = 0
    nf = len(fvg_t)
    for t in range(n):
        d = brk_dir[t]
        if d == 0:
            continue
        start = max(0, brk_pivot[t], t - 4 * lookback)
        origin = start
        for j in range(start, t + 1):
            if (d > 0 and low[j] < low[origin]) or (d < 0 and high[j] > high[origin]):
                origin = j
        ob = -1
        for j in range(origin, max(-1, origin - lookback - 1), -1):
            if (d > 0 and close[j] < open_[j]) or (d < 0 and close[j] > open_[j]):
                ob = j
                break
        if ob < 0:
            ob = origin
        t_[k], d_[k], top[k], bot[k] = t, d, high[ob], low[ob]
        if ob >= 1:
            ref = last_sl[ob - 1] if d > 0 else last_sh[ob - 1]
            if not np.isnan(ref) and ((d > 0 and low[origin] < ref) or (d < 0 and high[origin] > ref)):
                liq[k] = 1
        for j in range(ob + 1, t + 1):
            if abs(close[j] - open_[j]) >= disp_k * atr_[j]:
                disp[k] = 1
                break
        q = np.searchsorted(fvg_t, ob, side="right")  # first FVG created after the OB candle
        while q < nf and fvg_t[q] <= t:
            if fvg_dir[q] == d:
                has_fvg[k] = 1
                break
            q += 1
        k += 1
    return t_[:k], d_[:k], top[:k], bot[:k], liq[:k], has_fvg[:k], disp[:k]


@njit(cache=True)
def breaker_events(inval_dir, inval_top, inval_bot):
    """Breaker block: an order block closed through flips polarity (bullish OB broken -> bearish breaker)."""
    idx = np.nonzero(inval_dir)[0]
    return idx.astype(np.int64), (-inval_dir[idx]).astype(np.int8), inval_top[idx], inval_bot[idx]
