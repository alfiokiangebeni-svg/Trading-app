"""Engine: fills, costs, stop priority, break-even, sizing and loss limits."""
import numpy as np
import pandas as pd

from conftest import frame
from smcbot.backtest.engine import Costs, run_backtest

RISK = {"risk_per_trade": 0.01, "max_daily_loss": 0.03, "max_weekly_loss": 0.06, "breakeven_at_r": None, "max_hold_bars": 50}
NOCOST = Costs(spread=0.0, tick=0.01, slippage_ticks_max=0, contract=100, lot_step=0.01)


def _sig(n, at, d, sl, tp):
    s = pd.DataFrame({"dir": np.zeros(n, np.int8), "sl": np.nan, "tp": np.nan})
    s.loc[at, ["dir", "sl", "tp"]] = [d, sl, tp]
    return s


def test_long_target_hit_and_sizing():
    df = frame([(100, 100, 100, 100), (100, 100.5, 99.5, 100), (100, 103, 99.8, 102.5), (102.5, 103, 102, 102.5)])
    tr, eq = run_backtest(df, _sig(4, 0, 1, 99, 102), NOCOST, RISK, 10_000)
    t = tr.iloc[0]
    assert t.entry == 100 and t.exit == 102 and t.reason == "target"
    assert abs(t.lots - 1.0) < 1e-9          # 100 $ risk / (1 $ x 100 oz)
    assert abs(t.R - 2.0) < 1e-9 and abs(eq.iloc[-1] - 10_200) < 1e-6


def test_stop_wins_when_both_hit_same_bar():
    df = frame([(100, 100, 100, 100), (100, 100.2, 99.9, 100), (100, 103, 98, 100)])
    tr, _ = run_backtest(df, _sig(3, 0, 1, 99, 102), NOCOST, RISK, 10_000)
    assert tr.iloc[0].reason == "stop" and abs(tr.iloc[0].R + 1) < 1e-9


def test_short_pays_spread_and_commission():
    df = frame([(100, 100, 100, 100), (100, 100.1, 99.9, 100), (100, 100.2, 97.0, 97.5)])
    c = Costs(spread=0.3, tick=0.01, slippage_ticks_max=0, contract=100, lot_step=0.01, commission_per_lot=7)
    tr, _ = run_backtest(df, _sig(3, 0, -1, 101, 98), c, RISK, 10_000)
    t = tr.iloc[0]
    assert t.entry == 100 and t.exit == 98 and t.reason == "target"       # ask low 97.3 <= 98
    gross = 2 * t.lots * 100
    assert abs(t.pnl - (gross - 7 * t.lots)) < 1e-6


def test_gap_through_stop_fills_at_open():
    df = frame([(100, 100, 100, 100), (100, 100.2, 99.9, 100), (97, 97.5, 96, 97)])
    tr, _ = run_backtest(df, _sig(3, 0, 1, 99, 102), NOCOST, RISK, 10_000)
    assert tr.iloc[0].exit == 97 and tr.iloc[0].R < -2.9


def test_breakeven_after_1R():
    df = frame([(100, 100, 100, 100), (100, 101.2, 99.8, 101), (101, 101.1, 99.9, 100), (100, 100, 99, 99)])
    r = dict(RISK, breakeven_at_r=1.0)
    tr, _ = run_backtest(df, _sig(4, 0, 1, 99, 103), NOCOST, r, 10_000)
    assert tr.iloc[0].reason == "break-even" and abs(tr.iloc[0].pnl) < 1e-9


def test_daily_loss_limit_blocks_new_trades():
    rows = [(100, 100, 100, 100)]
    for _ in range(6):
        rows += [(100, 100.2, 99.9, 100), (100, 100, 98, 99)]   # every trade stopped out
    df = frame(rows, freq="15min")
    n = len(df)
    s = pd.DataFrame({"dir": np.zeros(n, np.int8), "sl": np.nan, "tp": np.nan})
    for i in range(0, n - 1, 2):
        s.loc[i, ["dir", "sl", "tp"]] = [1, 99, 103]
    tr, _ = run_backtest(df, s, NOCOST, RISK, 10_000)
    assert len(tr) == 3                                          # 3 x -1 % hits the 3 % daily cap


def test_slippage_is_reproducible():
    df = frame([(100, 100, 100, 100), (100, 100.2, 99.9, 100), (100, 103, 99.8, 102.5)])
    c = Costs(spread=0.0, tick=0.01, slippage_ticks_max=2, contract=100, lot_step=0.01)
    a, _ = run_backtest(df, _sig(3, 0, 1, 99, 102), c, RISK, 10_000, seed=1)
    b, _ = run_backtest(df, _sig(3, 0, 1, 99, 102), c, RISK, 10_000, seed=1)
    assert a.entry.iloc[0] == b.entry.iloc[0] and 100 <= a.entry.iloc[0] <= 100.02


def test_daily_limit_resets_each_day_with_millisecond_index():
    """Parquet files load as datetime64[ms]: day boundaries must still be detected."""
    rows = [(100, 100, 100, 100)]
    for _ in range(6):
        rows += [(100, 100.2, 99.9, 100), (100, 100, 98, 99)]
    df = frame(rows, freq="4h")                       # 13 bars spread over ~2 days
    df.index = df.index.as_unit("ms")
    n = len(df)
    s = pd.DataFrame({"dir": np.zeros(n, np.int8), "sl": np.nan, "tp": np.nan})
    for i in range(0, n - 1, 2):
        s.loc[i, ["dir", "sl", "tp"]] = [1, 99, 103]
    tr, _ = run_backtest(df, s, NOCOST, RISK, 10_000)
    # day 1: 3 entries; the 3rd closes on day 2 and counts there -> day 2 allows 2 more = 5.
    # Without a working day reset the 3 % cap would stop everything after 3 trades.
    assert len(tr) == 5
