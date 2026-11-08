"""Swings, BOS / CHoCH / MSS on hand-built price paths."""
import numpy as np

from conftest import frame, make_ohlc
from smcbot.features.smc import core


def test_atr_constant_range():
    df = frame([(10, 11, 9, 10)] * 30)
    a = core.atr(df.high.values, df.low.values, df.close.values, 14)
    assert np.allclose(a, 2.0)


def test_swing_confirmed_L_bars_after_pivot():
    #            0  1  2  3  4  5  6  7  8
    highs = [1, 2, 3, 9, 4, 3, 2, 5, 6]
    lows = [h - 1 for h in highs]
    lows[6] = -5  # pivot low at 6
    h, l = np.array(highs, float), np.array(lows, float)
    sh, shp, sl, slp, last_sh, last_sl = core.swings(h, l, 2)
    assert np.isnan(sh[3]) and sh[5] == 9 and shp[5] == 3          # pivot 3 known at 3 + 2
    assert sl[8] == -5 and slp[8] == 6                                # pivot 6 known at 8
    assert np.isnan(last_sh[4]) and last_sh[5] == 9 and last_sh[8] == 9


def test_equal_tops_marked_once():
    h = np.array([1, 2, 5, 5, 2, 1, 0], float)
    sh, *_ = core.swings(h, h - 1, 2)
    assert np.count_nonzero(~np.isnan(sh)) == 1 and sh[4] == 5       # first of the equal tops


def _structure(df, L=2, disp=1.2):
    o, h, l, c = (df[k].values for k in ("open", "high", "low", "close"))
    a = core.atr(h, l, c, 14)
    sh, shp, sl, slp, *_ = core.swings(h, l, L)
    return core.market_structure(o, h, l, c, a, sh, shp, sl, slp, disp)


def test_bos_then_choch():
    # up-leg with a swing high at 12, break above it (BOS), pull back, swing low, break below it (CHoCH)
    closes = [10, 11, 12, 11, 10, 11, 13, 14, 15, 14, 13, 14, 12, 9, 8]
    bos, choch, mss, lvl, piv, trend = _structure(make_ohlc(closes))
    t_bos = int(np.flatnonzero(bos == 1)[0])
    assert closes[t_bos] > 12 and lvl[t_bos] == 12 and trend[t_bos] == 1
    t_ch = int(np.flatnonzero(choch == -1)[0])
    assert t_ch > t_bos and trend[t_ch] == -1 and closes[t_ch] < lvl[t_ch]


def test_mss_requires_displacement():
    closes = [10, 11, 12, 11, 10, 11, 13, 14, 15, 14, 13, 14, 12, 9, 8]
    _, choch, mss_small, *_ = _structure(make_ohlc(closes), disp=50.0)   # impossible displacement
    _, _, mss_any, *_ = _structure(make_ohlc(closes), disp=0.0)
    assert choch.any() and not mss_small.any() and (mss_any == choch).all()


def test_swing_known_at_bar_cannot_break_on_same_bar():
    # the bar that confirms a swing high cannot also be counted as breaking it
    closes = [10, 11, 15, 11, 16]  # pivot 15 at 2 confirmed at 4 (L=2); bar 4 closes above 15
    bos, *_ = _structure(make_ohlc(closes))
    assert not bos.any()
