"""Event-driven backtest engine (numba), one strategy on one asset.

Execution model (deliberately conservative):
* A signal computed at the close of bar ``i`` is filled at the open of bar ``i + 1``.
* Prices are BID prices; ASK = BID + spread. Longs buy the ask and sell the bid, shorts the opposite.
* Random slippage of 0..N ticks against us on every fill (seeded, reproducible).
* If the stop and the target are both inside the same bar, the stop is assumed hit first.
* Break-even: once price reaches +``be_r`` R, the stop moves to the entry price from the next bar on.
* Commission per lot (metals) and/or a rate on the notional per side (crypto).

Risk rules enforced here, whatever the strategy asks:
* position size = equity x risk / stop distance (rounded down to ``lot_step``; skipped if 0);
* no new entry if losing its full risk would take the day beyond ``max_daily_loss`` or the week beyond
  ``max_weekly_loss`` (the limits can therefore never be breached by a stop);
* never more than one position for a single strategy run (the 2-position / correlation cap across
  assets is applied by the portfolio layer in phase 2);
* the stop is never moved against the trade (only to break-even).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from numba import njit

REASONS = {1: "stop", 2: "target", 3: "break-even", 4: "max bars", 5: "end of data"}


@njit(cache=True)
def _simulate(o, h, l, c, spread, sig_dir, sig_sl, sig_tp, day_id, week_id,
              equity0, risk, max_daily, max_weekly, be_r, max_hold, tick, slip_max, seed,
              contract, lot_step, comm_per_lot, comm_rate):
    np.random.seed(seed)
    n = len(c)
    cap = n // 2 + 1
    t_in = np.empty(cap, np.int64)
    t_out = np.empty(cap, np.int64)
    t_dir = np.empty(cap, np.int8)
    t_entry = np.empty(cap)
    t_exit = np.empty(cap)
    t_sl = np.empty(cap)
    t_tp = np.empty(cap)
    t_lots = np.empty(cap)
    t_pnl = np.empty(cap)
    t_r = np.empty(cap)
    t_reason = np.empty(cap, np.int8)
    t_eq = np.empty(cap)
    eq_curve = np.empty(n)
    k = 0
    eq = equity0
    day_start, week_start = eq, eq
    cur_day, cur_week = day_id[0], week_id[0]
    pos = 0
    entry = sl = tp = lots = risk_usd = 0.0
    i_in = 0
    be_done = False
    for i in range(n):
        if day_id[i] != cur_day:
            cur_day, day_start = day_id[i], eq
        if week_id[i] != cur_week:
            cur_week, week_start = week_id[i], eq
        # ---- manage the open position on bar i
        if pos != 0 and i > i_in:
            ask_h, ask_l = h[i] + spread[i], l[i] + spread[i]
            exit_px, reason = 0.0, 0
            if pos > 0:
                if l[i] <= sl:
                    exit_px, reason = min(sl, o[i]) - np.random.randint(0, slip_max + 1) * tick, 1
                elif h[i] >= tp:
                    exit_px, reason = tp, 2
            else:
                if ask_h >= sl:
                    exit_px, reason = max(sl, o[i] + spread[i]) + np.random.randint(0, slip_max + 1) * tick, 1
                elif ask_l <= tp:
                    exit_px, reason = tp, 2
            if reason == 1 and be_done:
                reason = 3
            if reason == 0 and (i - i_in >= max_hold or i == n - 1):
                exit_px = c[i] if pos > 0 else c[i] + spread[i]
                reason = 4 if i - i_in >= max_hold else 5
            if reason != 0:
                gross = (exit_px - entry) * pos * lots * contract
                comm = lots * comm_per_lot + comm_rate * lots * contract * (entry + exit_px)
                pnl = gross - comm
                eq += pnl
                t_in[k], t_out[k], t_dir[k] = i_in, i, pos
                t_entry[k], t_exit[k], t_sl[k], t_tp[k] = entry, exit_px, sl, tp
                t_lots[k], t_pnl[k], t_r[k], t_reason[k], t_eq[k] = lots, pnl, pnl / risk_usd, reason, eq
                k += 1
                pos = 0
            elif be_r > 0 and not be_done:
                r_dist = abs(entry - sl)
                if (pos > 0 and h[i] >= entry + be_r * r_dist) or (pos < 0 and ask_l <= entry - be_r * r_dist):
                    sl = entry
                    be_done = True
        eq_curve[i] = eq
        # ---- new entry: signal at close of i, filled at open of i + 1
        if pos == 0 and i + 1 < n and sig_dir[i] != 0:
            # never open a trade whose stop could push the day / week beyond its loss limit
            next_risk = eq * risk
            if (day_start - eq) + next_risk > day_start * max_daily + 1e-9 or \
               (week_start - eq) + next_risk > week_start * max_weekly + 1e-9:
                continue
            d = sig_dir[i]
            slip = np.random.randint(0, slip_max + 1) * tick
            fill = o[i + 1] + spread[i + 1] + slip if d > 0 else o[i + 1] - slip
            stop, target = sig_sl[i], sig_tp[i]
            if (fill - stop) * d <= 0 or (target - fill) * d <= 0:
                continue  # gap through the stop or the target: no trade
            dist = abs(fill - stop)
            r_usd = eq * risk
            raw_lots = r_usd / (dist * contract)
            lt = np.floor(raw_lots / lot_step) * lot_step
            if lt <= 0:
                continue
            pos, entry, sl, tp, lots, i_in, be_done = d, fill, stop, target, lt, i + 1, False
            risk_usd = lt * dist * contract
    return (t_in[:k], t_out[:k], t_dir[:k], t_entry[:k], t_exit[:k], t_sl[:k], t_tp[:k], t_lots[:k],
            t_pnl[:k], t_r[:k], t_reason[:k], t_eq[:k], eq_curve)


@dataclass
class Costs:
    spread: float = 0.3
    tick: float = 0.01
    slippage_ticks_max: int = 2
    contract: float = 100.0
    lot_step: float = 0.01
    commission_per_lot: float = 0.0
    commission_rate: float = 0.0

    @classmethod
    def from_config(cls, c: dict) -> "Costs":
        return cls(spread=c.get("spread", 0.0), tick=c.get("tick_size", 0.01),
                   slippage_ticks_max=int(c.get("slippage_ticks_max", 0)), contract=c.get("contract_size", 1.0),
                   lot_step=c.get("lot_step", 0.01 if c.get("contract_size", 1) >= 100 else 0.0001),
                   commission_per_lot=c.get("commission_per_lot", 0.0), commission_rate=c.get("commission_rate", 0.0))


def run_backtest(df: pd.DataFrame, sig: pd.DataFrame, costs: Costs, risk: dict, equity0: float = 10_000,
                 seed: int = 42, use_data_spread: bool = True, daily_close_utc_hour: int = 0) -> tuple[pd.DataFrame, pd.Series]:
    """Run one strategy. ``sig`` has columns dir (+1/-1/0), sl, tp computed at each bar's close.

    Returns (trades DataFrame, equity Series at each bar close).
    """
    o, h, l, c = (df[k].to_numpy(np.float64) for k in ("open", "high", "low", "close"))
    if use_data_spread and "spread" in df and df["spread"].notna().any():
        spread = df["spread"].fillna(costs.spread).to_numpy(np.float64)
    else:
        spread = np.full(len(df), costs.spread)
    shifted = df.index + pd.Timedelta(hours=24 - daily_close_utc_hour) if daily_close_utc_hour else df.index
    day_id = (shifted.normalize().as_unit("ns").asi8 // 86_400_000_000_000).astype(np.int64)  # any resolution
    week_id = ((day_id + 3) // 7).astype(np.int64)  # weeks starting Monday
    r = _simulate(o, h, l, c, spread, sig["dir"].to_numpy(np.int8), sig["sl"].to_numpy(np.float64),
                  sig["tp"].to_numpy(np.float64), day_id, week_id, float(equity0), float(risk["risk_per_trade"]),
                  float(risk["max_daily_loss"]), float(risk["max_weekly_loss"]),
                  float(risk.get("breakeven_at_r") or 0.0), int(risk.get("max_hold_bars", 10**9)),
                  costs.tick, costs.slippage_ticks_max, seed, costs.contract, costs.lot_step,
                  costs.commission_per_lot, costs.commission_rate)
    cols = ["i_in", "i_out", "dir", "entry", "exit", "sl", "tp", "lots", "pnl", "R", "reason", "equity"]
    tr = pd.DataFrame(dict(zip(cols, r[:12])))
    tr["time_in"] = df.index[tr["i_in"]]
    tr["time_out"] = df.index[tr["i_out"]]
    tr["reason"] = tr["reason"].map(REASONS)
    for extra in [x for x in sig.columns if x not in ("dir", "sl", "tp")]:
        tr[extra] = sig[extra].to_numpy()[tr["i_in"] - 1]  # context of the signal bar
    return tr, pd.Series(r[12], index=df.index, name="equity")
