"""Visual check of the SMC detectors on real data (candles + swings, BOS/CHoCH, OB, FVG, sweeps).

    python scripts/plot_detectors.py --dataset BTCUSD --tf M15 --end 2025-06-04 --bars 220
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import plotly.graph_objects as go  # noqa: E402

from smcbot.config import BOT_ROOT, load_config  # noqa: E402
from smcbot.data.pipeline import load  # noqa: E402
from smcbot.features.smc import compute_features, zones  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="BTCUSD")
    ap.add_argument("--tf", default="M15")
    ap.add_argument("--end", help="last bar (UTC date); default = latest")
    ap.add_argument("--bars", type=int, default=220)
    a = ap.parse_args()
    cfg = load_config()
    df = load(cfg, a.dataset, a.tf)
    if a.end:
        df = df.loc[: pd.Timestamp(a.end, tz="UTC")]
    df = df.iloc[-(a.bars + 600):]  # warm-up so zones / structure exist at the window start
    f = compute_features(df, cfg["smc"], cfg["sessions"], 0)
    w0 = len(df) - a.bars
    d, fw = df.iloc[w0:], f.iloc[w0:]
    x = d.index
    fig = go.Figure(go.Candlestick(x=x, open=d.open, high=d.high, low=d.low, close=d.close, name="prix",
                                   increasing_line_color="#1fe0a1", decreasing_line_color="#ff4d6d"))
    L = cfg["smc"]["swing_length"]
    # swings drawn on their PIVOT bar, with the confirmation bar noted (they are only known L bars later)
    for col, sym, color, name in (("swing_high", "triangle-down", "#ffb547", "swing high"), ("swing_low", "triangle-up", "#4da3ff", "swing low")):
        conf = np.flatnonzero(~np.isnan(f[col].to_numpy()))
        conf = conf[(conf - L) >= w0]
        fig.add_trace(go.Scatter(x=df.index[conf - L], y=f[col].to_numpy()[conf], mode="markers", name=name + f" (connu {L} bougies après)",
                                 marker=dict(symbol=sym, size=10, color=color)))
    for col, label in (("bos", "BOS"), ("choch", "CHoCH"), ("mss", "MSS")):
        ev = fw[fw[col] != 0]
        for t, row in ev.iterrows():
            fig.add_annotation(x=t, y=row["brk_level"], text=label, showarrow=True, arrowhead=0, ax=-30, ay=-18 if row[col] > 0 else 18,
                               font=dict(size=10, color="#1fe0a1" if row[col] > 0 else "#ff4d6d"))
    o, h, l, c = (df[k].to_numpy() for k in ("open", "high", "low", "close"))
    fv = zones.fvg_events(h, l, f["atr"].to_numpy(), cfg["smc"]["fvg_min_atr"])
    brk = (f["bos"] + f["choch"]).to_numpy().astype(np.int8)
    piv = np.full(len(df), -1, np.int64)
    # rebuild pivots for OB display
    from smcbot.features.smc import core
    sh, shp, sl_, slp, last_sh, last_sl = core.swings(h, l, L)
    *_, piv_arr, _ = core.market_structure(o, h, l, c, f["atr"].to_numpy(), sh, shp, sl_, slp, cfg["smc"]["displacement_atr"])
    ob = zones.order_block_events(o, h, l, c, f["atr"].to_numpy(), brk, piv_arr, last_sl, last_sh, fv[0], fv[1],
                                  cfg["smc"]["ob_lookback"], cfg["smc"]["displacement_atr"])
    def boxes(ev, kind, max_len=60):
        for t, dr, top, bot in zip(*ev[:4]):
            if t < w0:
                continue
            x1 = df.index[min(len(df) - 1, t + max_len)]
            col = ("rgba(31,224,161,.18)", "#1fe0a1") if dr > 0 else ("rgba(255,77,109,.16)", "#ff4d6d")
            if kind == "FVG":
                col = ("rgba(242,193,78,.16)", "#f2c14e")
            fig.add_shape(type="rect", x0=df.index[t], x1=x1, y0=bot, y1=top, fillcolor=col[0], line=dict(color=col[1], width=1))
            fig.add_annotation(x=df.index[t], y=top, text=kind, showarrow=False, xanchor="left", yanchor="bottom", font=dict(size=9, color=col[1]))
    boxes(fv, "FVG", 30)
    boxes(ob, "OB", 60)
    for col, label in (("sweep_swing", "sweep"), ("sweep_pd", "sweep PDH/PDL"), ("sweep_asia", "sweep Asie")):
        ev = fw[fw[col] != 0]
        fig.add_trace(go.Scatter(x=ev.index, y=np.where(ev[col] > 0, d.loc[ev.index, "low"] * 0.999, d.loc[ev.index, "high"] * 1.001),
                                 mode="markers+text", text=[label] * len(ev), textposition="bottom center", name=label,
                                 marker=dict(symbol="x", size=9, color="#c084fc")))
    fig.update_layout(template="plotly_dark", height=760, xaxis_rangeslider_visible=False, paper_bgcolor="#0b0f16", plot_bgcolor="#0b0f16",
                      title=f"Détecteurs SMC — {a.dataset} {a.tf} ({x[0]:%Y-%m-%d %H:%M} → {x[-1]:%Y-%m-%d %H:%M} UTC). "
                            "OB et FVG dessinés à leur bougie de création (moment où ils sont connus).",
                      margin=dict(l=40, r=20, t=60, b=30), legend=dict(orientation="h", y=-0.06))
    out = BOT_ROOT / "reports" / f"detectors_{a.dataset}_{a.tf}.html"
    fig.write_html(out, include_plotlyjs="cdn")
    print(out)


if __name__ == "__main__":
    main()
