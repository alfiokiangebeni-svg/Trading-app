"""Step 2 — first simple backtest (one SMC combination) on in-sample and validation data.

The final 20 % test period stays LOCKED: it is not loaded here.

    python scripts/backtest_simple.py --asset BTCUSD
    python scripts/backtest_simple.py --asset XAUUSD --dataset XAUUSD_PAXG
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pandas as pd  # noqa: E402

from smcbot.backtest.engine import Costs, run_backtest  # noqa: E402
from smcbot.backtest.metrics import summary  # noqa: E402
from smcbot.config import BOT_ROOT, load_config  # noqa: E402
from smcbot.data.clean import split_periods  # noqa: E402
from smcbot.data.pipeline import load  # noqa: E402
from smcbot.features.smc import align_htf, compute_features  # noqa: E402
from smcbot.reports.html import write_report  # noqa: E402
from smcbot.strategies.simple_smc import SimpleSMCParams, signals  # noqa: E402


def run(asset: str, dataset: str, cfg: dict, exec_tf: str = "M15", bias_tf: str = "H1", params: SimpleSMCParams | None = None):
    params = params or SimpleSMCParams()
    acfg = cfg["data"]["assets"][asset]
    close_h = acfg.get("daily_close_utc_hour", 0)
    ltf, htf = load(cfg, dataset, exec_tf), load(cfg, dataset, bias_tf)
    periods = split_periods(ltf.index, cfg["split"]["in_sample"], cfg["split"]["validation"])
    ltf = ltf.loc[: periods["validation"].stop]  # test period locked: never loaded
    htf = htf.loc[htf["close_time"] <= periods["validation"].stop]
    feat = compute_features(ltf, cfg["smc"], cfg["sessions"], close_h)
    hfeat = compute_features(htf, cfg["smc"], None, close_h)
    bias = align_htf(ltf, hfeat, htf["close_time"], ["trend"], "htf_")["htf_trend"]
    sig = signals(feat, ltf, bias, params)
    costs = Costs.from_config(cfg["costs"][asset])
    out = {}
    for name in ("in_sample", "validation"):
        sl = periods[name]
        mask = (ltf.index >= sl.start) & (ltf.index < sl.stop)
        tr, eq = run_backtest(ltf[mask], sig[mask], costs, cfg["risk"], cfg["backtest"]["initial_equity"],
                              cfg["backtest"]["seed"], cfg["costs"][asset].get("use_data_spread", False), close_h)
        ppy = 365 if asset.startswith("BTC") else 252
        out[name] = (summary(tr, eq, cfg["backtest"]["initial_equity"], ppy), tr, eq)
    return out, periods


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--asset", required=True, choices=["XAUUSD", "BTCUSD"])
    ap.add_argument("--dataset", help="processed dataset name (default: the asset)")
    ap.add_argument("--rr", type=float, default=2.0)
    a = ap.parse_args()
    cfg = load_config()
    ds = a.dataset or a.asset
    res, periods = run(a.asset, ds, cfg, params=SimpleSMCParams(rr=a.rr))
    src = (BOT_ROOT / cfg["data"]["root"] / "raw" / f"{ds}_M1.source.txt")
    src_txt = src.read_text().strip() if src.exists() else "?"
    labels = {"in_sample": f"In-sample ({periods['in_sample'].start:%Y-%m} → {periods['in_sample'].stop:%Y-%m})",
              "validation": f"Validation ({periods['validation'].start:%Y-%m} → {periods['validation'].stop:%Y-%m})"}
    sections = {labels[k]: v for k, v in res.items()}
    warnings = [f"Période de test finale ({periods['test'].start:%Y-%m-%d} → {periods['test'].stop:%Y-%m-%d}) verrouillée : non utilisée.",
                "Une seule combinaison testée : ces chiffres valident la chaîne (données → détecteurs → moteur → rapport), "
                "ils ne prouvent rien sur la rentabilité future."]
    if "PAXG" in src_txt:
        warnings.append("Or simulé avec PAXG/USDT (jeton adossé à l'or) : proxy du XAUUSD, liquidité et spread différents. "
                        "Refaire le test sur Dukascopy ou MT5 avant toute conclusion.")
    out = write_report(BOT_ROOT / "reports" / f"backtest_simple_{ds}.html",
                       f"Backtest simple SMC — {ds}", f"Source {src_txt} · exécution M15, biais H1 · RR {a.rr} · risque "
                       f"{cfg['risk']['risk_per_trade'] * 100:.1f} % · coûts réels (spread, commission, slippage)", sections, warnings)
    print(json.dumps({k: v[0] for k, v in res.items()}, indent=1, default=float))
    print(f"report: {out}")


if __name__ == "__main__":
    main()
