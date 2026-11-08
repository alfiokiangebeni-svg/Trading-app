import numpy as np

from conftest import frame
from smcbot.features.smc import price_action


def _pa(rows):
    df = frame(rows)
    return price_action.candle_patterns(*(df[k].values for k in ("open", "high", "low", "close")))


def test_pin_bars():
    pin, _, _ = _pa([(10, 10.2, 7, 10.1), (10, 13, 9.9, 9.95)])
    assert list(pin) == [1, -1]


def test_engulfing():
    _, eng, _ = _pa([(10, 10.1, 9, 9.2), (9.1, 10.5, 9, 10.3), (9.8, 10.4, 9.7, 10.0), (10.1, 10.2, 9.0, 9.1)])
    assert list(eng) == [0, 1, 0, -1]


def test_inside_bar_breakout():
    _, _, ibb = _pa([(10, 12, 8, 11), (11, 11.5, 9, 10), (10, 12.5, 9.5, 12.3)])
    assert ibb[2] == 1


def test_level_rejection_uses_previous_level():
    h = np.array([11.0, 11.0]); l = np.array([9.0, 9.95]); c = np.array([10.0, 10.5])
    r = price_action.level_rejection(h, l, c, np.full(2, 20.0), np.array([10.0, 10.0]), np.ones(2), 0.1)
    assert list(r) == [0, 1]
