"""Configuration loading (single YAML file, see config/config.yaml)."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

BOT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = BOT_ROOT / "config" / "config.yaml"


def load_config(path: str | Path | None = None) -> dict[str, Any]:
    with open(path or DEFAULT_CONFIG, encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    cfg["_root"] = BOT_ROOT
    return cfg


def data_dir(cfg: dict[str, Any], *parts: str) -> Path:
    p = BOT_ROOT / cfg["data"]["root"]
    for part in parts:
        p = p / part
    p.mkdir(parents=True, exist_ok=True)
    return p
