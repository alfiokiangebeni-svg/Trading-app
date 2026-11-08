"""Pure price-action patterns, each known at the close of the bar it is stored on."""
from __future__ import annotations

import numpy as np
from numba import njit


@njit(cache=True)
def candle_patterns(open_, high, low, close, wick_ratio=2.0):
    """pin bar, engulfing, inside-bar breakout: +1 bullish / -1 bearish / 0.

    * pin bar   : rejection wick >= wick_ratio * body and >= 55 % of the range, close in the opposite third
    * engulfing : body engulfs the previous opposite body
    * inside bar breakout: bar t-1 inside bar t-2, bar t closes beyond bar t-2's range
    """
    n = len(close)
    pin = np.zeros(n, np.int8)
    eng = np.zeros(n, np.int8)
    ibb = np.zeros(n, np.int8)
    for t in range(n):
        body = abs(close[t] - open_[t])
        rng = high[t] - low[t]
        if rng <= 0:
            continue
        lw = min(open_[t], close[t]) - low[t]
        uw = high[t] - max(open_[t], close[t])
        if lw >= wick_ratio * body and lw >= 0.55 * rng and close[t] - low[t] >= 0.6 * rng:
            pin[t] = 1
        elif uw >= wick_ratio * body and uw >= 0.55 * rng and high[t] - close[t] >= 0.6 * rng:
            pin[t] = -1
        if t >= 1:
            pb = abs(close[t - 1] - open_[t - 1])
            if close[t] > open_[t] and close[t - 1] < open_[t - 1] and close[t] >= open_[t - 1] and open_[t] <= close[t - 1] and body > pb:
                eng[t] = 1
            elif close[t] < open_[t] and close[t - 1] > open_[t - 1] and close[t] <= open_[t - 1] and open_[t] >= close[t - 1] and body > pb:
                eng[t] = -1
        if t >= 2 and high[t - 1] <= high[t - 2] and low[t - 1] >= low[t - 2]:
            if close[t] > high[t - 2]:
                ibb[t] = 1
            elif close[t] < low[t - 2]:
                ibb[t] = -1
    return pin, eng, ibb


@njit(cache=True)
def level_rejection(high, low, close, level_hi, level_lo, atr_, tol_atr=0.1):
    """Rejection of a known level: wick reaches the level (within tolerance) and the close stays on the
    original side. Levels must be known before the bar (they are read at t-1). +1 at support, -1 at resistance."""
    n = len(close)
    out = np.zeros(n, np.int8)
    for t in range(1, n):
        r, s, tol = level_hi[t - 1], level_lo[t - 1], tol_atr * atr_[t]
        if not np.isnan(s) and low[t] <= s + tol and close[t] > s:
            out[t] = 1
        elif not np.isnan(r) and high[t] >= r - tol and close[t] < r:
            out[t] = -1
    return out
