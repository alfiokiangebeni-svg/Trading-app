"""Raw M1 data sources.

Each loader returns a DataFrame indexed by UTC timestamps (bar open time) with columns
open, high, low, close, volume and optionally spread (ask - bid at the close, in price units).

* Dukascopy  — free real spot XAUUSD, M1 BID and ASK candles (so the real spread is known).
* Binance Vision — free monthly archives of Binance spot klines (BTCUSDT, PAXGUSDT...).
* MetaTrader 5 — the user's broker feed (Windows + MT5 terminal only).
* ccxt — any exchange supported by ccxt (rate limited, slower than the archives).
* CSV — any file with time, open, high, low, close[, volume, spread] columns.
"""
from __future__ import annotations

import io
import lzma
import struct
import time
import urllib.error
import urllib.request
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

COLS = ["open", "high", "low", "close", "volume"]
UA = {"User-Agent": "smcbot-research/0.1"}


def _get(url: str, retries: int = 6, base_wait: float = 2.0, timeout: int = 60) -> bytes | None:
    """HTTP GET with exponential backoff on 429 / 5xx / network errors. Returns None on 404."""
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code not in (429, 500, 502, 503, 504) or attempt == retries - 1:
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == retries - 1:
                raise
        time.sleep(base_wait * 2 ** attempt)
    return None


# --------------------------------------------------------------------------- Binance Vision
BINANCE_VISION = "https://data.binance.vision/data/spot"


def _parse_binance_klines(raw: bytes) -> pd.DataFrame:
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        with z.open(z.namelist()[0]) as f:
            df = pd.read_csv(f, header=None, usecols=range(6))
    if not np.issubdtype(df[0].dtype, np.number):  # some archives carry a header row
        df = df[pd.to_numeric(df[0], errors="coerce").notna()].astype(float)
    ts = df[0].astype("int64")
    # Spot archives switched from milliseconds to microseconds on 2025-01-01.
    unit = np.where(ts > 10**14, "us", "ms")
    idx = pd.to_datetime(np.where(unit == "us", ts // 1000, ts), unit="ms", utc=True)
    out = pd.DataFrame(df[[1, 2, 3, 4, 5]].to_numpy(float), index=idx, columns=COLS)
    out.index.name = "time"
    return out


def binance_vision_m1(symbol: str, start: date, end: date, cache_dir: Path | None = None,
                      log=print) -> pd.DataFrame:
    """Download M1 klines from data.binance.vision: monthly archives, daily ones for the current month."""
    frames, d = [], date(start.year, start.month, 1)
    today = datetime.now(timezone.utc).date()
    while d <= end:
        nxt = date(d.year + (d.month == 12), d.month % 12 + 1, 1)
        if nxt <= today:  # full month archive exists
            name = f"{symbol}-1m-{d:%Y-%m}.zip"
            url = f"{BINANCE_VISION}/monthly/klines/{symbol}/1m/{name}"
            raw = _cached(url, cache_dir, name)
            if raw is not None:
                frames.append(_parse_binance_klines(raw))
                log(f"  {name}: ok")
        else:  # current month -> daily archives (published with a ~1 day delay)
            day = d
            while day < min(nxt, today):
                name = f"{symbol}-1m-{day:%Y-%m-%d}.zip"
                raw = _cached(f"{BINANCE_VISION}/daily/klines/{symbol}/1m/{name}", cache_dir, name)
                if raw is not None:
                    frames.append(_parse_binance_klines(raw))
                day += timedelta(days=1)
            log(f"  {d:%Y-%m} (daily files): ok")
        d = nxt
    if not frames:
        raise RuntimeError(f"No Binance Vision data for {symbol}")
    df = pd.concat(frames)
    return df.loc[(df.index >= pd.Timestamp(start, tz="UTC")) & (df.index < pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1))]


def _cached(url: str, cache_dir: Path | None, name: str) -> bytes | None:
    if cache_dir is not None:
        p = Path(cache_dir) / name
        if p.exists():
            return p.read_bytes()
    raw = _get(url)
    if raw is not None and cache_dir is not None:
        Path(cache_dir).mkdir(parents=True, exist_ok=True)
        (Path(cache_dir) / name).write_bytes(raw)
    return raw


# --------------------------------------------------------------------------- Dukascopy
DUKA = "https://datafeed.dukascopy.com/datafeed"
_REC = struct.Struct(">5if")  # seconds offset, open, close, low, high (price points), volume


def decode_dukascopy_candles(raw: bytes, day: date, divisor: float) -> pd.DataFrame:
    """Decode one Dukascopy daily M1 candle file (LZMA, 24-byte big-endian records)."""
    if not raw:
        return pd.DataFrame(columns=COLS, index=pd.DatetimeIndex([], tz="UTC", name="time"))
    data = lzma.decompress(raw)
    arr = np.frombuffer(data, dtype=np.dtype([("t", ">i4"), ("o", ">i4"), ("c", ">i4"),
                                               ("l", ">i4"), ("h", ">i4"), ("v", ">f4")]))
    t0 = pd.Timestamp(day, tz="UTC")
    idx = t0 + pd.to_timedelta(arr["t"].astype(np.int64), unit="s")
    df = pd.DataFrame({"open": arr["o"] / divisor, "high": arr["h"] / divisor, "low": arr["l"] / divisor,
                       "close": arr["c"] / divisor, "volume": arr["v"].astype(float)}, index=idx)
    df.index.name = "time"
    return df[df["volume"] > 0]  # Dukascopy pads closed-market minutes with flat zero-volume bars


def dukascopy_m1(symbol: str, start: date, end: date, divisor: float, cache_dir: Path | None = None,
                 throttle: float = 1.2, log=print) -> pd.DataFrame:
    """Download Dukascopy M1 BID and ASK candles day by day; returns BID OHLC + real spread column.

    Dukascopy rate-limits aggressively (HTTP 429): requests are throttled and retried with backoff,
    and every day file is cached so an interrupted download resumes where it stopped.
    """
    frames, d, n = [], start, 0
    while d <= end:
        if d.weekday() != 5:  # no trading on Saturdays
            sides = {}
            for side in ("BID", "ASK"):
                name = f"{symbol}_{d:%Y%m%d}_{side}.bi5"
                path = Path(cache_dir) / name if cache_dir else None
                if path is not None and path.exists():
                    raw = path.read_bytes()
                else:
                    url = f"{DUKA}/{symbol}/{d.year}/{d.month - 1:02d}/{d.day:02d}/{side}_candles_min_1.bi5"
                    raw = _get(url, retries=8, base_wait=5.0) or b""
                    if raw.startswith(b"{"):  # JSON error body served with 200
                        raise RuntimeError(f"Dukascopy refused {url}: {raw[:120]!r}")
                    if path is not None:
                        path.parent.mkdir(parents=True, exist_ok=True)
                        path.write_bytes(raw)
                    time.sleep(throttle)
                sides[side] = decode_dukascopy_candles(raw, d, divisor)
            bid, ask = sides["BID"], sides["ASK"]
            if len(bid):
                bid = bid.copy()
                bid["spread"] = (ask["close"].reindex(bid.index) - bid["close"]).clip(lower=0)
                frames.append(bid)
            n += 1
            if n % 20 == 0:
                log(f"  {symbol} {d}: {sum(len(f) for f in frames):,} bars")
        d += timedelta(days=1)
    if not frames:
        raise RuntimeError(f"No Dukascopy data for {symbol}")
    return pd.concat(frames)


# --------------------------------------------------------------------------- MetaTrader 5 / ccxt / CSV
def mt5_m1(symbol: str, start: date, end: date) -> pd.DataFrame:  # pragma: no cover - needs MT5 terminal
    import MetaTrader5 as mt5  # Windows only

    if not mt5.initialize():
        raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")
    try:
        rates = mt5.copy_rates_range(symbol, mt5.TIMEFRAME_M1, datetime(start.year, start.month, start.day, tzinfo=timezone.utc),
                                     datetime(end.year, end.month, end.day, 23, 59, tzinfo=timezone.utc))
    finally:
        mt5.shutdown()
    df = pd.DataFrame(rates)
    df.index = pd.to_datetime(df["time"], unit="s", utc=True)  # broker server time: check its offset!
    df["spread"] = df["spread"] * mt5.symbol_info(symbol).point if "spread" in df else np.nan
    df = df.rename(columns={"tick_volume": "volume"})[COLS + ["spread"]]
    df.index.name = "time"
    return df


def ccxt_m1(symbol: str, start: date, end: date, exchange: str = "binance") -> pd.DataFrame:  # pragma: no cover
    import ccxt

    ex = getattr(ccxt, exchange)({"enableRateLimit": True})
    since, stop, rows = ex.parse8601(f"{start}T00:00:00Z"), ex.parse8601(f"{end}T23:59:00Z"), []
    while since < stop:
        batch = ex.fetch_ohlcv(symbol, "1m", since=since, limit=1000)
        if not batch:
            break
        rows += batch
        since = batch[-1][0] + 60_000
    df = pd.DataFrame(rows, columns=["t"] + COLS)
    df.index = pd.to_datetime(df.pop("t"), unit="ms", utc=True)
    df.index.name = "time"
    return df


def csv_m1(path: str | Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    tcol = next(c for c in df.columns if c.lower() in ("time", "timestamp", "date", "datetime"))
    df.index = pd.to_datetime(df.pop(tcol), utc=True)
    df.columns = [c.lower() for c in df.columns]
    df.index.name = "time"
    return df[[c for c in COLS + ["spread"] if c in df.columns]]
