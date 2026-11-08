"""Building blocks shared by every SMC detector.

Causality rule used everywhere in this package: the value stored at bar ``t`` uses only bars
``0..t`` (information available at the close of bar ``t``). A swing pivot at bar ``p`` with
length ``L`` is therefore stored at its confirmation bar ``p + L``, never at ``p``.
The test suite enforces this by recomputing every detector on truncated data.
"""
from __future__ import annotations

import numpy as np
from numba import njit

NAN = np.nan


@njit(cache=True)
def atr(high, low, close, period=14):
    """Wilder ATR, causal; the first bars use the average true range seen so far."""
    n = len(close)
    out = np.empty(n)
    a = 0.0
    for i in range(n):
        if i == 0:
            tr = high[0] - low[0]
        else:
            tr = max(high[i] - low[i], abs(high[i] - close[i - 1]), abs(low[i] - close[i - 1]))
        if i < period:
            a = (a * i + tr) / (i + 1)
        else:
            a = (a * (period - 1) + tr) / period
        out[i] = a if a > 0 else 1e-12
    return out


@njit(cache=True)
def swings(high, low, length):
    """Swing highs / lows with ``length`` bars on each side.

    A pivot high at ``p``: high[p] > every high of the ``length`` bars before and >= every high of
    the ``length`` bars after (the first of equal tops is kept). It becomes known at ``p + length``.

    Returns, indexed by the confirmation bar:
      sh_price, sh_pivot : price and pivot index of a swing high confirmed at this bar (NaN / -1)
      sl_price, sl_pivot : same for swing lows
      last_sh, last_sl   : most recent confirmed swing high / low known at this bar (forward filled)
    """
    n = len(high)
    sh_price = np.full(n, NAN)
    sl_price = np.full(n, NAN)
    sh_pivot = np.full(n, -1, np.int64)
    sl_pivot = np.full(n, -1, np.int64)
    for p in range(length, n - length):
        hp, lp = high[p], low[p]
        is_h, is_l = True, True
        for k in range(p - length, p):
            if high[k] >= hp:
                is_h = False
            if low[k] <= lp:
                is_l = False
        for k in range(p + 1, p + length + 1):
            if high[k] > hp:
                is_h = False
            if low[k] < lp:
                is_l = False
        t = p + length
        if is_h:
            sh_price[t] = hp
            sh_pivot[t] = p
        if is_l:
            sl_price[t] = lp
            sl_pivot[t] = p
    last_sh = np.full(n, NAN)
    last_sl = np.full(n, NAN)
    a, b = NAN, NAN
    for t in range(n):
        if not np.isnan(sh_price[t]):
            a = sh_price[t]
        if not np.isnan(sl_price[t]):
            b = sl_price[t]
        last_sh[t] = a
        last_sl[t] = b
    return sh_price, sh_pivot, sl_price, sl_pivot, last_sh, last_sl


@njit(cache=True)
def market_structure(open_, high, low, close, atr_, sh_price, sh_pivot, sl_price, sl_pivot, disp_k):
    """BOS / CHoCH / MSS on candle closes beyond the last confirmed, unbroken swing.

    * BOS   : break in the direction of the current trend (or first break).
    * CHoCH : first break against the current trend (trend flips).
    * MSS   : a CHoCH whose breaking candle is a displacement candle (body >= disp_k * ATR).

    Outputs per bar (event at the breaking bar, known at its close):
      bos, choch, mss : +1 bullish / -1 bearish / 0
      level           : broken swing price
      pivot           : index of the broken swing pivot
      trend           : structure trend after this bar (+1 / -1 / 0)
    A swing confirmed at bar t can only be broken from bar t+1 on.
    """
    n = len(close)
    bos = np.zeros(n, np.int8)
    choch = np.zeros(n, np.int8)
    mss = np.zeros(n, np.int8)
    level = np.full(n, NAN)
    pivot = np.full(n, -1, np.int64)
    trend_out = np.zeros(n, np.int8)
    trend = 0
    h_px, h_pv, h_ok = NAN, -1, False
    l_px, l_pv, l_ok = NAN, -1, False
    for t in range(n):
        disp = abs(close[t] - open_[t]) >= disp_k * atr_[t]
        if h_ok and close[t] > h_px:
            if trend < 0:
                choch[t] = 1
                if disp:
                    mss[t] = 1
            else:
                bos[t] = 1
            level[t], pivot[t] = h_px, h_pv
            trend, h_ok = 1, False
        elif l_ok and close[t] < l_px:
            if trend > 0:
                choch[t] = -1
                if disp:
                    mss[t] = -1
            else:
                bos[t] = -1
            level[t], pivot[t] = l_px, l_pv
            trend, l_ok = -1, False
        if not np.isnan(sh_price[t]):
            h_px, h_pv, h_ok = sh_price[t], sh_pivot[t], True
        if not np.isnan(sl_price[t]):
            l_px, l_pv, l_ok = sl_price[t], sl_pivot[t], True
        trend_out[t] = trend
    return bos, choch, mss, level, pivot, trend_out


# ----------------------------------------------------------------------------- zone tracking
@njit(cache=True)
def track_zones(high, low, close, z_t, z_dir, z_top, z_bot, max_age, kind_code):
    """Follow zones (OB, FVG, breaker, ...) bar by bar and report the first touch ("tap").

    Zones become active on the bar *after* their creation bar ``z_t`` (they are known at its close).
    A bullish zone is tapped when low <= top; it is invalidated when a candle closes below bottom.
    Bearish zones mirror this. Each zone can be tapped once; it expires after ``max_age`` bars.

    Per-bar outputs (known at the close of the bar):
      tap_dir, tap_top, tap_bot, tap_age, tap_kind : first touch of a fresh zone this bar (dir 0 = none);
                                                     if several zones are tapped, the most recent wins
      bull_top/bull_bot : nearest fresh bullish zone below price (NaN if none)
      bear_top/bear_bot : nearest fresh bearish zone above price
      inval_dir         : +1/-1 if a zone of that direction was invalidated this bar (for breakers / IFVG)
      inval_top/inval_bot: bounds of that invalidated zone
    """
    n = len(close)
    m = len(z_t)
    tap_dir = np.zeros(n, np.int8)
    tap_top = np.full(n, NAN)
    tap_bot = np.full(n, NAN)
    tap_age = np.full(n, -1, np.int64)
    tap_kind = np.zeros(n, np.int8)
    bull_top = np.full(n, NAN)
    bull_bot = np.full(n, NAN)
    bear_top = np.full(n, NAN)
    bear_bot = np.full(n, NAN)
    inval_dir = np.zeros(n, np.int8)
    inval_top = np.full(n, NAN)
    inval_bot = np.full(n, NAN)
    state = np.zeros(m, np.int8)  # 0 pending, 1 fresh, 2 tapped (still valid), 3 dead
    first = 0  # zones sorted by creation time
    for t in range(n):
        best_created = -1
        for j in range(first, m):
            if z_t[j] >= t:
                break
            if state[j] == 0:
                state[j] = 1
            if state[j] == 3:
                continue
            if t - z_t[j] > max_age:
                state[j] = 3
                continue
            d = z_dir[j]
            touched = low[t] <= z_top[j] if d > 0 else high[t] >= z_bot[j]
            broken = close[t] < z_bot[j] if d > 0 else close[t] > z_top[j]
            if touched and state[j] == 1 and not broken and z_t[j] > best_created:
                best_created = z_t[j]
                tap_dir[t] = d
                tap_top[t] = z_top[j]
                tap_bot[t] = z_bot[j]
                tap_age[t] = t - z_t[j]
                tap_kind[t] = kind_code
            if broken:
                state[j] = 3
                inval_dir[t] = d
                inval_top[t] = z_top[j]
                inval_bot[t] = z_bot[j]
            elif touched and state[j] == 1:
                state[j] = 2
        # nearest fresh zones (after this bar's interactions)
        px = close[t]
        for j in range(first, m):
            if z_t[j] >= t:
                break
            if state[j] != 1:
                continue
            if z_dir[j] > 0 and z_top[j] < px and (np.isnan(bull_top[t]) or z_top[j] > bull_top[t]):
                bull_top[t], bull_bot[t] = z_top[j], z_bot[j]
            if z_dir[j] < 0 and z_bot[j] > px and (np.isnan(bear_bot[t]) or z_bot[j] < bear_bot[t]):
                bear_top[t], bear_bot[t] = z_top[j], z_bot[j]
        while first < m and state[first] == 3:
            first += 1
    return (tap_dir, tap_top, tap_bot, tap_age, tap_kind, bull_top, bull_bot, bear_top, bear_bot,
            inval_dir, inval_top, inval_bot)
