"""Download -> clean -> resample -> Parquet, driven by config.yaml."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

from ..config import data_dir
from . import sources
from .clean import clean_m1, resample


def _fetch(source: str, symbol: str, start: date, end: date, acfg: dict, cache: Path, log) -> pd.DataFrame:
    if source == "dukascopy":
        return sources.dukascopy_m1(symbol, start, end, acfg.get("price_divisor", 1000), cache / "dukascopy", log=log)
    if source == "binance_vision":
        return sources.binance_vision_m1(symbol, start, end, cache / "binance_vision", log=log)
    if source == "mt5":
        return sources.mt5_m1(symbol, start, end)
    if source == "ccxt":
        return sources.ccxt_m1(symbol.replace("USDT", "/USDT"), start, end)
    if source == "csv":
        return sources.csv_m1(acfg["path"])
    raise ValueError(f"unknown source {source}")


def download(cfg: dict, asset: str, start: date | None = None, end: date | None = None, source: str | None = None,
             log=print, name: str | None = None) -> Path:
    """Download M1 history for one asset into data/raw/<asset>_M1.parquet (resumable: day files are cached)."""
    acfg = cfg["data"]["assets"][asset]
    end = end or (datetime.now(timezone.utc).date() - timedelta(days=1))
    start = start or end - timedelta(days=int(365.25 * cfg["data"]["years"]))
    src, sym = source or acfg["source"], acfg["symbol"]
    if source and source == acfg.get("fallback", {}).get("source"):
        sym = acfg["fallback"]["symbol"]
    log(f"{asset}: {src} {sym} {start} -> {end}")
    df = _fetch(src, sym, start, end, acfg, data_dir(cfg, "raw"), log)
    df.attrs = {}
    name = name or asset
    out = data_dir(cfg, "raw") / f"{name}_M1.parquet"
    df.to_parquet(out)
    (data_dir(cfg, "raw") / f"{name}_M1.source.txt").write_text(f"{src}:{sym}\n")
    log(f"{asset}: {len(df):,} M1 bars -> {out}")
    return out


def build(cfg: dict, asset: str, log=print, name: str | None = None) -> dict[str, Path]:
    """Clean raw M1 and write every configured timeframe to data/processed/<name>_<TF>.parquet."""
    name = name or asset
    raw = pd.read_parquet(data_dir(cfg, "raw") / f"{name}_M1.parquet")
    market = "fx" if asset.startswith("XAU") else "24/7"
    m1, rep = clean_m1(raw, market=market)
    log(f"{asset} cleaning: {rep.summary()}")
    close_h = cfg["data"]["assets"][asset].get("daily_close_utc_hour", cfg["data"]["daily_close_utc_hour"])
    paths = {}
    for tf in ["M1"] + list(cfg["data"]["timeframes"]):
        out = data_dir(cfg, "processed") / f"{name}_{tf}.parquet"
        resample(m1, tf, close_h).to_parquet(out)
        paths[tf] = out
    log(f"{asset}: timeframes {', '.join(paths)} written")
    return paths


def load(cfg: dict, name: str, tf: str) -> pd.DataFrame:
    """Load a processed timeframe, e.g. load(cfg, "XAUUSD", "M15") or load(cfg, "XAUUSD_PAXG", "M15")."""
    return pd.read_parquet(data_dir(cfg, "processed") / f"{name}_{tf}.parquet")
