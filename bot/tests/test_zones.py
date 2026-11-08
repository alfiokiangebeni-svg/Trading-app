"""FVG, IFVG, BPR, order blocks, breakers and the zone tracker."""
import numpy as np

from conftest import frame
from smcbot.features.smc import core, zones


def test_fvg_bull_and_bear_known_at_third_candle():
    df = frame([(10, 11, 9, 10.5), (10.5, 14, 10.4, 13.8), (13.8, 15, 12, 14.5),   # bull gap: low[2]=12 > high[0]=11
                (14.5, 14.6, 13, 13.2), (13.2, 13.3, 9, 9.5), (9.5, 12, 8, 8.5)])   # bear gap: high[5]=12 < low[3]=13
    a = np.full(len(df), 1.0)
    t, d, top, bot = zones.fvg_events(df.high.values, df.low.values, a, 0.0)
    assert list(t) == [2, 5] and list(d) == [1, -1]
    assert (top[0], bot[0]) == (12, 11) and (top[1], bot[1]) == (13, 12)


def test_fvg_min_size_filter():
    df = frame([(10, 11, 9, 10.5), (10.5, 14, 10.4, 13.8), (13.8, 15, 11.05, 14.5)])  # gap 0.05
    t, *_ = zones.fvg_events(df.high.values, df.low.values, np.full(3, 1.0), 0.1)
    assert len(t) == 0


def test_tracker_tap_once_and_invalidation():
    h = np.array([20, 20, 20, 20, 20, 20], float)
    l = np.array([15, 15, 11.5, 11.2, 15, 9], float)
    c = np.array([16, 16, 13, 12, 16, 9.5], float)
    zt, zd = np.array([0], np.int64), np.array([1], np.int8)
    r = core.track_zones(h, l, c, zt, zd, np.array([12.0]), np.array([10.0]), 100, 2)
    tap, inval = r[0], r[9]
    assert list(tap) == [0, 0, 1, 0, 0, 0]       # first touch only (bar 3 touches again: no new tap)
    assert inval[5] == 1                          # close 9.5 < bottom 10 -> invalidated


def test_tracker_zone_not_usable_on_creation_bar():
    h = np.array([20.0, 20]); l = np.array([11.0, 11]); c = np.array([16.0, 16])
    r = core.track_zones(h, l, c, np.array([0], np.int64), np.array([1], np.int8), np.array([12.0]), np.array([10.0]), 100, 2)
    assert list(r[0]) == [0, 1]


def test_tracker_expiry():
    n = 20
    h = np.full(n, 20.0); l = np.full(n, 15.0); c = np.full(n, 16.0); l[-1] = 11
    r = core.track_zones(h, l, c, np.array([0], np.int64), np.array([1], np.int8), np.array([12.0]), np.array([10.0]), 5, 2)
    assert not r[0].any()


def test_ifvg_and_breaker_flip_polarity():
    inval = np.array([0, 1, 0, -1], np.int8)
    top = np.array([np.nan, 12, np.nan, 30]); bot = np.array([np.nan, 10, np.nan, 28])
    for fn in (zones.ifvg_events, zones.breaker_events):
        t, d, tp, bt = fn(inval, top, bot)
        assert list(t) == [1, 3] and list(d) == [-1, 1] and list(tp) == [12, 30]


def test_bpr_overlap():
    t, d, top, bot = zones.bpr_events(np.array([5, 9], np.int64), np.array([-1, 1], np.int8),
                                      np.array([20.0, 19.0]), np.array([17.0, 16.0]), 20)
    assert list(t) == [9] and d[0] == 1 and (top[0], bot[0]) == (19, 17)


def test_order_block_last_opposite_candle_before_break():
    rows = [(10, 10.5, 9.5, 10), (10, 12, 9.8, 11.8), (11.8, 12.2, 11, 11.2),   # swing high 12.2 at 2
            (11.2, 11.3, 10, 10.2), (10.2, 10.4, 9.0, 9.2),                     # bearish candle = OB (bar 4)
            (9.2, 11, 9.1, 10.9), (10.9, 13, 10.8, 12.9)]                       # displacement, close > 12.2
    df = frame(rows)
    o, h, l, c = (df[k].values for k in ("open", "high", "low", "close"))
    a = np.full(len(df), 1.0)
    brk = np.zeros(len(df), np.int8); brk[6] = 1
    piv = np.full(len(df), -1, np.int64); piv[6] = 2
    nan = np.full(len(df), np.nan)
    ft, fd, _, _ = zones.fvg_events(h, l, a, 0.0)
    t, d, top, bot, liq, fvg, disp = zones.order_block_events(o, h, l, c, a, brk, piv, nan, nan, ft, fd, 10, 1.2)
    assert list(t) == [6] and d[0] == 1 and (top[0], bot[0]) == (10.4, 9.0)
    assert disp[0] == 1 and fvg[0] == 1   # 2.0 body candle; gap low[6]=10.8 > high[4]=10.4
