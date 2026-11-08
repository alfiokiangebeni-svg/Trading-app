import numpy as np
import pandas as pd

from smcbot.data.clean import clean_m1, resample, split_periods
from smcbot.data.sources import _parse_binance_klines, decode_dukascopy_candles


def _m1(n=10, start="2024-03-04 00:00"):
    idx = pd.date_range(start, periods=n, freq="1min", tz="UTC")
    c = np.arange(n, dtype=float) + 100
    return pd.DataFrame({"open": c - 0.5, "high": c + 1, "low": c - 1, "close": c, "volume": 1.0}, index=idx)


def test_clean_dedupe_invalid_and_ohlc_fix():
    df = _m1(6)
    df = pd.concat([df, df.iloc[[2]]])            # duplicate
    df.iloc[3, df.columns.get_loc("close")] = -1  # invalid
    df.iloc[4, df.columns.get_loc("high")] = 0.5  # high below body
    out, rep = clean_m1(df)
    assert rep.duplicates == 1 and rep.invalid == 1 and rep.ohlc_fixed == 1
    assert out.index.is_monotonic_increasing and (out["high"] >= out[["open", "close"]].max(axis=1)).all()


def test_clean_drops_metal_weekend_and_reports_gaps():
    idx = pd.DatetimeIndex(["2024-03-08 21:58", "2024-03-09 10:00", "2024-03-10 22:01", "2024-03-12 08:00"], tz="UTC")
    df = pd.DataFrame({"open": 1.0, "high": 1.0, "low": 1.0, "close": 1.0, "volume": 1.0}, index=idx)
    out, rep = clean_m1(df, market="fx")
    assert rep.weekend_dropped == 1                       # Saturday bar
    assert len(rep.gaps) == 1 and rep.gaps[0][1].startswith("2024-03-12")   # weekend gap ignored, Tuesday gap reported


def test_resample_m5_values_and_close_time():
    df = _m1(10)
    m5 = resample(df, "M5")
    assert len(m5) == 2
    first = m5.iloc[0]
    assert first.open == df.open.iloc[0] and first.close == df.close.iloc[4]
    assert first.high == df.high.iloc[:5].max() and first.low == df.low.iloc[:5].min()
    assert m5.close_time.iloc[0] == df.index[5]


def test_resample_daily_close_at_22_utc():
    idx = pd.date_range("2024-03-04 20:00", periods=4 * 60, freq="1min", tz="UTC")
    df = pd.DataFrame({"open": 1.0, "high": 1.0, "low": 1.0, "close": 1.0, "volume": 1.0}, index=idx)
    d1 = resample(df, "D1", daily_close_utc_hour=22)
    assert list(d1.index.strftime("%m-%d %H:%M")) == ["03-03 22:00", "03-04 22:00"]


def test_split_60_20_20_is_chronological():
    idx = pd.date_range("2020-01-01", "2025-01-01", freq="1D", tz="UTC")
    s = split_periods(idx)
    assert s["in_sample"].stop == s["validation"].start < s["validation"].stop == s["test"].start


def test_binance_ms_and_us_timestamps():
    import io, zipfile
    rows = "1704067200000,1,2,0.5,1.5,10,0,0,0,0,0,0\n1735689600000000,1,2,0.5,1.5,10,0,0,0,0,0,0\n"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("x.csv", rows)
    df = _parse_binance_klines(buf.getvalue())
    assert list(df.index.strftime("%Y-%m-%d")) == ["2024-01-01", "2025-01-01"]


def test_dukascopy_decoder():
    import lzma, struct
    rec = struct.pack(">5if", 60, 2063625, 2064000, 2063000, 2064425, 0.5)
    df = decode_dukascopy_candles(lzma.compress(rec, format=lzma.FORMAT_ALONE), pd.Timestamp("2024-01-02").date(), 1000)
    assert df.index[0] == pd.Timestamp("2024-01-02 00:01", tz="UTC")
    assert (df.open.iloc[0], df.close.iloc[0], df.low.iloc[0], df.high.iloc[0]) == (2063.625, 2064.0, 2063.0, 2064.425)
