"""First simple SMC strategy, used to validate the whole chain before the massive search.

Rules (one combination out of the future grid):
  bias        : H1 market-structure trend (closed H1 bars only)
  zone        : first tap of a fresh M15 FVG or order block in the bias direction
  location    : long only in discount (pd_pos < 0.5), short only in premium (> 0.5)
  confirmation: within ``confirm_bars`` candles after the tap, a candle closes in the trade direction
                while the zone holds (no close beyond it); entry at the next open
  session     : London or New York AM kill zone
  stop        : beyond the zone, plus ``sl_atr`` x ATR
  target      : fixed ``rr`` x risk
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from numba import njit


@dataclass
class SimpleSMCParams:
    rr: float = 2.0
    sl_atr: float = 0.2
    zones: tuple[str, ...] = ("fvg", "ob")
    sessions: tuple[str, ...] = ("london", "ny_am")
    use_pd: bool = True
    min_risk_atr: float = 0.3
    max_risk_atr: float = 3.0
    confirm_bars: int = 3
    extra: dict = field(default_factory=dict)


def signals(feat: pd.DataFrame, ohlc: pd.DataFrame, bias: pd.Series, p: SimpleSMCParams) -> pd.DataFrame:
    """Return dir / sl / tp per bar (decided at the bar's close) plus context columns for the report."""
    n = len(feat)
    c, o = ohlc["close"].to_numpy(), ohlc["open"].to_numpy()
    a = feat["atr"].to_numpy()
    b = bias.fillna(0).to_numpy()
    sess = np.zeros(n, bool)
    for s in p.sessions:
        sess |= feat[f"kz_{s}"].to_numpy()
    dir_ = np.zeros(n, np.int8)
    top = np.full(n, np.nan)
    bot = np.full(n, np.nan)
    kind = np.array([""] * n, dtype=object)
    for z in p.zones:  # first listed zone type has priority
        tap = feat[f"{z}_tap"].to_numpy()
        free = (dir_ == 0) & (tap != 0)
        dir_[free] = tap[free]
        top[free] = feat[f"{z}_tap_top"].to_numpy()[free]
        bot[free] = feat[f"{z}_tap_bot"].to_numpy()[free]
        kind[free] = z.upper()
    setup = (dir_ != 0) & (dir_ == b) & sess
    if p.use_pd:
        pos = feat["pd_pos"].to_numpy()
        setup &= np.where(dir_ > 0, pos < 0.5, pos > 0.5)
    news = feat["news"].to_numpy() if "news" in feat else np.zeros(n, bool)
    d, sl, tp = _confirm(setup, dir_, top, bot, o, c, a, b, news, p.confirm_bars, p.sl_atr, p.rr,
                         p.min_risk_atr, p.max_risk_atr)
    ok = d != 0
    # zone type of the setup that produced each signal
    src = pd.Series(np.where(setup, kind, None), index=feat.index).ffill(limit=p.confirm_bars).to_numpy()
    kind = np.where(ok, src, "")
    session_name = np.full(n, "other", dtype=object)
    for s in reversed(p.sessions):
        session_name[feat[f"kz_{s}"].to_numpy()] = s
    return pd.DataFrame({"dir": d, "sl": sl, "tp": tp,
                         "zone": kind, "session": session_name, "dow": feat["dow"].to_numpy(),
                         "ob_quality": feat["ob_tap_quality"].to_numpy()}, index=feat.index)


@njit(cache=True)
def _confirm(setup, dir_, top, bot, o, c, atr_, bias, news, k, sl_atr, rr, min_r, max_r):
    """Turn zone taps into entries: wait up to k bars for a close in the trade direction while the
    zone holds; the stop goes beyond the zone (+ sl_atr x ATR), the target at rr x risk."""
    n = len(c)
    d = np.zeros(n, np.int8)
    sl = np.full(n, np.nan)
    tp = np.full(n, np.nan)
    pend, pdir, ptop, pbot = -1, 0, 0.0, 0.0
    for t in range(n):
        if setup[t]:
            pend, pdir, ptop, pbot = t, dir_[t], top[t], bot[t]
        if pend < 0:
            continue
        if t - pend > k or bias[t] != pdir:
            pend = -1
            continue
        if (pdir > 0 and c[t] < pbot) or (pdir < 0 and c[t] > ptop):
            pend = -1  # zone failed
            continue
        if news[t]:
            continue
        if (pdir > 0 and c[t] > o[t]) or (pdir < 0 and c[t] < o[t]):
            stop = pbot - sl_atr * atr_[t] if pdir > 0 else ptop + sl_atr * atr_[t]
            risk = (c[t] - stop) * pdir
            if min_r * atr_[t] <= risk <= max_r * atr_[t]:
                d[t], sl[t], tp[t] = pdir, stop, c[t] + pdir * rr * risk
            pend = -1
    return d, sl, tp
