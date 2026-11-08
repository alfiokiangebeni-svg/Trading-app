"""Step 1 — download M1 history and build M5/M15/H1/H4/D1 Parquet files.

    python scripts/download_data.py --asset BTCUSD
    python scripts/download_data.py --asset XAUUSD --years 5
    python scripts/download_data.py --asset XAUUSD --source binance_vision --name XAUUSD_PAXG  # proxy, fast
    python scripts/download_data.py --asset XAUUSD --build-only
"""
from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from smcbot.config import load_config  # noqa: E402
from smcbot.data.pipeline import build, download  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--asset", required=True, choices=["XAUUSD", "BTCUSD"])
    ap.add_argument("--years", type=float)
    ap.add_argument("--start", type=date.fromisoformat)
    ap.add_argument("--end", type=date.fromisoformat)
    ap.add_argument("--source", help="override the source from config.yaml")
    ap.add_argument("--name", help="output dataset name (default: the asset), e.g. XAUUSD_PAXG")
    ap.add_argument("--build-only", action="store_true")
    ap.add_argument("--config")
    a = ap.parse_args()
    cfg = load_config(a.config)
    if a.years:
        cfg["data"]["years"] = a.years
    if not a.build_only:
        download(cfg, a.asset, a.start, a.end, a.source, log=lambda m: print(m, flush=True), name=a.name)
    build(cfg, a.asset, log=lambda m: print(m, flush=True), name=a.name)


if __name__ == "__main__":
    main()
