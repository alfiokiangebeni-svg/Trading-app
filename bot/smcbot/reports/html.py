"""HTML backtest report: equity, drawdown, statistics by period / session / day / SMC brick."""
from __future__ import annotations

import html
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from ..backtest.metrics import breakdown

LABELS = {
    "trades": "Trades", "trades_per_month": "Trades / mois", "win_rate": "Taux de réussite", "profit_factor": "Profit factor",
    "expectancy_R": "Espérance (R)", "avg_win_R": "Gain moyen (R)", "avg_loss_R": "Perte moyenne (R)",
    "net_return": "Rendement net", "cagr": "Rendement annualisé", "max_drawdown": "Drawdown max", "sharpe": "Sharpe",
    "calmar": "Calmar", "longest_losing_streak": "Pertes consécutives max",
}
PCT = {"win_rate", "net_return", "cagr", "max_drawdown"}
CSS = """
body{font-family:Inter,system-ui,sans-serif;background:#0b0f16;color:#e6e9ef;margin:0;padding:24px;max-width:1280px;margin:auto}
h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 8px;color:#f2c14e}
p.sub{color:#8e98aa;margin:0 0 18px;font-size:13px} .warn{border:1px solid #ffb547;background:rgba(255,181,71,.08);padding:10px 14px;border-radius:10px;font-size:13px}
table{border-collapse:collapse;font-size:12.5px;margin:6px 0;width:100%} th,td{padding:6px 10px;border-bottom:1px solid #1e2633;text-align:right}
th:first-child,td:first-child{text-align:left} th{color:#8e98aa;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(560px,1fr));gap:18px} .grid>div{overflow-x:auto} .pos{color:#1fe0a1}.neg{color:#ff4d6d}
"""


def _fmt(k: str, v) -> str:
    if isinstance(v, float):
        if v == float("inf"):
            return "∞"
        return f"{v * 100:.1f} %" if k in PCT else f"{v:.2f}"
    return str(v)


def _table(df: pd.DataFrame) -> str:
    if df is None or df.empty:
        return "<p class='sub'>—</p>"
    d = df.copy()
    for c in d.columns:
        if c == "win_rate":
            d[c] = (d[c] * 100).map("{:.1f} %".format)
        elif d[c].dtype.kind == "f":
            d[c] = d[c].map(lambda x: "∞" if x == float("inf") else f"{x:,.2f}")
    d = d.rename(columns={"trades": "trades", "win_rate": "réussite", "profit_factor": "PF", "expectancy_R": "esp. R",
                          "sum_R": "Σ R", "pnl": "P&L $"})
    d.index.name = None
    return d.to_html(classes="t", border=0, escape=True)


def write_report(path: Path, title: str, subtitle: str, sections: dict[str, tuple[dict, pd.DataFrame, pd.Series]],
                 warnings: list[str] | None = None) -> Path:
    """sections: name -> (summary dict, trades, equity). One column of the summary table per section."""
    parts = [f"<h1>{html.escape(title)}</h1><p class='sub'>{html.escape(subtitle)}</p>"]
    for w in warnings or []:
        parts.append(f"<p class='warn'>{html.escape(w)}</p>")
    keys = list(LABELS)
    rows = "".join(
        f"<tr><td>{LABELS[k]}</td>" + "".join(f"<td>{_fmt(k, s[0].get(k, '—'))}</td>" for s in sections.values()) + "</tr>"
        for k in keys)
    parts.append("<h2>Résumé</h2><table><tr><th></th>" + "".join(f"<th>{html.escape(n)}</th>" for n in sections) + f"</tr>{rows}</table>")
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_heights=[0.7, 0.3], vertical_spacing=0.04)
    for name, (_, _, eq) in sections.items():
        e = eq.resample("4h").last().dropna() if len(eq) > 5000 else eq
        fig.add_trace(go.Scatter(x=e.index, y=e.values, name=name, mode="lines"), 1, 1)
        dd = (e / e.cummax() - 1) * 100
        fig.add_trace(go.Scatter(x=dd.index, y=dd.values, name=f"DD {name}", mode="lines", fill="tozeroy", showlegend=False), 2, 1)
    fig.update_layout(template="plotly_dark", height=560, margin=dict(l=50, r=20, t=30, b=30), paper_bgcolor="#0b0f16",
                      plot_bgcolor="#0b0f16", legend=dict(orientation="h", y=1.05))
    fig.update_yaxes(title_text="Capital ($)", row=1, col=1)
    fig.update_yaxes(title_text="Drawdown %", row=2, col=1)
    parts.append("<h2>Courbe de capital et drawdown</h2>" + fig.to_html(full_html=False, include_plotlyjs="cdn"))
    for name, (_, tr, _) in sections.items():
        if tr.empty:
            continue
        tr = tr.copy()
        tr["mois"] = tr["time_out"].dt.strftime("%Y-%m")
        tr["jour"] = tr["time_in"].dt.day_name()
        parts.append(f"<h2>{html.escape(name)} — détail</h2><div class='grid'>")
        for label, col in [("Par session", "session"), ("Par jour", "jour"), ("Par brique SMC (zone)", "zone"),
                           ("Par qualité d'OB (liq.+FVG+déplacement)", "ob_quality"), ("Par sens", "dir"), ("Par sortie", "reason")]:
            if col in tr:
                parts.append(f"<div><h3 style='font-size:13px'>{label}</h3>{_table(breakdown(tr, col))}</div>")
        parts.append("</div>")
        monthly = tr.groupby("mois")["R"].sum().to_frame("somme R")
        parts.append(f"<h3 style='font-size:13px'>Résultat par mois (en R)</h3>{_table(monthly.T)}")
    doc = f"<!doctype html><html lang='fr'><meta charset='utf-8'><title>{html.escape(title)}</title><style>{CSS}</style><body>{''.join(parts)}</body></html>"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(doc, encoding="utf-8")
    return path
