"""Performance statistics of a backtest (after costs)."""
from __future__ import annotations

import numpy as np
import pandas as pd


def max_drawdown(equity: pd.Series) -> float:
    peak = equity.cummax()
    return float(((peak - equity) / peak).max()) if len(equity) else 0.0


def summary(trades: pd.DataFrame, equity: pd.Series, equity0: float, periods_per_year: int = 252) -> dict:
    n = len(trades)
    if n == 0:
        return {"trades": 0}
    wins = trades["pnl"] > 0
    gp = trades.loc[wins, "pnl"].sum()
    gl = -trades.loc[~wins, "pnl"].sum()
    daily = equity.resample("1D").last().dropna()
    rets = daily.pct_change().dropna()
    rets = rets[rets.index.dayofweek < 5] if periods_per_year == 252 else rets
    years = max((equity.index[-1] - equity.index[0]).days / 365.25, 1e-9)
    end = float(equity.iloc[-1])
    cagr = (end / equity0) ** (1 / years) - 1 if end > 0 else -1.0
    dd = max_drawdown(equity)
    return {
        "trades": n,
        "trades_per_month": n / (years * 12),
        "win_rate": float(wins.mean()),
        "profit_factor": float(gp / gl) if gl > 0 else float("inf"),
        "expectancy_R": float(trades["R"].mean()),
        "avg_win_R": float(trades.loc[wins, "R"].mean()) if wins.any() else 0.0,
        "avg_loss_R": float(trades.loc[~wins, "R"].mean()) if (~wins).any() else 0.0,
        "net_return": end / equity0 - 1,
        "cagr": cagr,
        "max_drawdown": dd,
        "sharpe": float(rets.mean() / rets.std() * np.sqrt(periods_per_year)) if rets.std() > 0 else 0.0,
        "calmar": cagr / dd if dd > 0 else float("inf"),
        "longest_losing_streak": int(_longest_streak(~wins.to_numpy())),
    }


def _longest_streak(mask: np.ndarray) -> int:
    best = cur = 0
    for m in mask:
        cur = cur + 1 if m else 0
        best = max(best, cur)
    return best


def breakdown(trades: pd.DataFrame, by: str) -> pd.DataFrame:
    if trades.empty or by not in trades:
        return pd.DataFrame()
    g = trades.groupby(by, observed=True)
    out = pd.DataFrame({
        "trades": g.size(),
        "win_rate": g["pnl"].apply(lambda s: (s > 0).mean()),
        "expectancy_R": g["R"].mean(),
        "sum_R": g["R"].sum(),
        "pnl": g["pnl"].sum(),
    })
    pf = g["pnl"].apply(lambda s: s[s > 0].sum() / -s[s <= 0].sum() if (s <= 0).any() and s[s <= 0].sum() < 0 else np.inf)
    out.insert(2, "profit_factor", pf)
    return out
