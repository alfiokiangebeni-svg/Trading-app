"""SMC / ICT detectors. ``compute_features`` builds every brick for one timeframe.

All columns at row ``t`` are known at the close of bar ``t`` (see core.py and tests/test_causality.py).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import core, liquidity, price_action, sessions, zones
from .filters import atr_percentile, news_blackout

ZONE_KIND = {"OB": 1, "FVG": 2, "BRK": 3, "IFVG": 4, "BPR": 5}


def _zone_cols(prefix, h, l, c, ev, max_age, kind):
    r = core.track_zones(h, l, c, ev[0], ev[1], ev[2], ev[3], max_age, kind)
    names = ["tap", "tap_top", "tap_bot", "tap_age", "tap_kind", "bull_top", "bull_bot", "bear_top", "bear_bot",
             "inval", "inval_top", "inval_bot"]
    return {f"{prefix}_{n}": v for n, v in zip(names, r)}


def compute_features(df: pd.DataFrame, smc: dict, sess_cfg: dict | None = None, daily_close_utc_hour: int = 0,
                     news_csv: str | None = None) -> pd.DataFrame:
    """Every SMC / price-action brick for one OHLC timeframe (index = bar open time, UTC)."""
    o, h, l, c = (df[k].to_numpy(np.float64) for k in ("open", "high", "low", "close"))
    L = int(smc.get("swing_length", 5))
    a = core.atr(h, l, c, int(smc.get("atr_period", 14)))
    sh, shp, sl, slp, last_sh, last_sl = core.swings(h, l, L)
    disp_k = float(smc.get("displacement_atr", 1.2))
    bos, choch, mss, lvl, piv, trend = core.market_structure(o, h, l, c, a, sh, shp, sl, slp, disp_k)
    out: dict[str, np.ndarray] = {
        "atr": a, "swing_high": sh, "swing_low": sl, "last_sh": last_sh, "last_sl": last_sl,
        "bos": bos, "choch": choch, "mss": mss, "brk_level": lvl, "trend": trend,
    }
    max_age = int(smc.get("zone_max_age", 300))
    # FVG -> IFVG, BPR
    fv = zones.fvg_events(h, l, a, float(smc.get("fvg_min_atr", 0.15)))
    out["fvg_new"] = np.zeros(len(c), np.int8)
    out["fvg_new"][fv[0]] = fv[1]
    out |= _zone_cols("fvg", h, l, c, fv, max_age, ZONE_KIND["FVG"])
    out |= _zone_cols("ifvg", h, l, c, zones.ifvg_events(out["fvg_inval"], out["fvg_inval_top"], out["fvg_inval_bot"]),
                      max_age, ZONE_KIND["IFVG"])
    bp = zones.bpr_events(fv[0], fv[1], fv[2], fv[3], 20)
    out |= _zone_cols("bpr", h, l, c, bp, max_age, ZONE_KIND["BPR"])
    # Order blocks (from every break) -> breakers
    brk_dir = (bos + choch).astype(np.int8)
    ob = zones.order_block_events(o, h, l, c, a, brk_dir, piv, last_sl, last_sh, fv[0], fv[1],
                                  int(smc.get("ob_lookback", 10)), disp_k)
    out |= _zone_cols("ob", h, l, c, ob[:4], max_age, ZONE_KIND["OB"])
    # quality of the OB tapped at each bar (liquidity taken + FVG left + displacement)
    q = np.zeros(len(c), np.int8)
    if len(ob[0]):
        score = (ob[4] + ob[5] + ob[6]).astype(np.int8)
        key = pd.Series(score, index=pd.MultiIndex.from_arrays([ob[2], ob[3]]))
        key = key[~key.index.duplicated(keep="last")]
        tapped = out["ob_tap"] != 0
        idx = pd.MultiIndex.from_arrays([out["ob_tap_top"][tapped], out["ob_tap_bot"][tapped]])
        q[tapped] = key.reindex(idx).fillna(0).to_numpy(np.int8)
    out["ob_tap_quality"] = q
    out |= _zone_cols("brk", h, l, c, zones.breaker_events(out["ob_inval"], out["ob_inval_top"], out["ob_inval_bot"]),
                      max_age, ZONE_KIND["BRK"])
    # Liquidity
    eqh, eql = liquidity.equal_levels(sh, sl, a, float(smc.get("equal_level_atr", 0.1)), 20)
    out["eqh"], out["eql"] = eqh, eql
    out["sweep_swing"], _ = liquidity.sweeps(h, l, c, last_sh, last_sl)
    out["sweep_eq"], _ = liquidity.sweeps(h, l, c, eqh, eql)
    idx = df.index
    out["pdh"], out["pdl"] = liquidity.period_extremes(df, sessions.trading_day_keys(idx, daily_close_utc_hour))
    out["pwh"], out["pwl"] = liquidity.period_extremes(df, sessions.trading_week_keys(idx, daily_close_utc_hour))
    out["sweep_pd"], _ = liquidity.sweeps(h, l, c, out["pdh"], out["pdl"])
    if sess_cfg:
        flags = sessions.session_flags(idx, sess_cfg)
        for name in flags.columns:
            out[f"kz_{name}"] = flags[name].to_numpy()
        if "asia" in flags:
            ah, al = liquidity.period_extremes(df, sessions.session_keys(idx, flags["asia"], "asia"))
            out["asia_high"], out["asia_low"] = ah, al
            out["sweep_asia"], _ = liquidity.sweeps(h, l, c, ah, al)
    # Premium / discount / OTE
    ote = smc.get("ote", [0.62, 0.79])
    out["pd_pos"], out["ote_long"], out["ote_short"] = liquidity.premium_discount(c, last_sh, last_sl, ote[0], ote[1])
    # Price action
    out["pin"], out["engulf"], out["inside_brk"] = price_action.candle_patterns(o, h, l, c)
    out["level_reject"] = price_action.level_rejection(h, l, c, last_sh, last_sl, a)
    # Filters
    out["atr_pct"] = atr_percentile(a)
    out["dow"] = idx.dayofweek.to_numpy()
    out["news"] = news_blackout(idx, news_csv)
    return pd.DataFrame(out, index=idx)


def align_htf(ltf: pd.DataFrame, htf_feat: pd.DataFrame, htf_close_time: pd.Series, cols: list[str],
              prefix: str) -> pd.DataFrame:
    """Attach higher-timeframe columns to a lower timeframe without look-ahead.

    A higher-timeframe bar is used only once it has closed: each LTF bar (known at its close_time)
    receives the values of the last HTF bar whose close_time <= that instant.
    """
    left = pd.DataFrame({"ct": ltf["close_time"].to_numpy(), "_t": ltf.index})
    right = htf_feat[cols].copy()
    right["ct"] = htf_close_time.to_numpy()
    right = right.sort_values("ct")
    m = pd.merge_asof(left.sort_values("ct"), right, on="ct", direction="backward")
    m = m.set_index("_t").reindex(ltf.index)
    return m[cols].add_prefix(prefix)
