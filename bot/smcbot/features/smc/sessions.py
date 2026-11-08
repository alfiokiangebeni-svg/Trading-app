"""Sessions and ICT kill zones, defined in New York local time (daylight saving handled)."""
from __future__ import annotations

import numpy as np
import pandas as pd

NY = "America/New_York"


def _minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def session_flags(index: pd.DatetimeIndex, sessions: dict[str, list[str]]) -> pd.DataFrame:
    """One boolean column per session: True when the bar *opens* inside the window (NY time).

    Windows crossing midnight (e.g. Asia 20:00 -> 00:00) are supported.
    """
    ny = index.tz_convert(NY)
    mins = ny.hour * 60 + ny.minute
    out = {}
    for name, (a, b) in sessions.items():
        s, e = _minutes(a), _minutes(b)
        out[name] = (mins >= s) & (mins < e) if s < e else (mins >= s) | (mins < e)
    return pd.DataFrame(out, index=index)


def session_keys(index: pd.DatetimeIndex, flags: pd.Series, name: str) -> pd.Series:
    """Label each bar of a session with a unique key (so its high/low can be computed once it ends)."""
    ny = index.tz_convert(NY)
    # a session starting in the evening (Asia) belongs to the next trading day
    day = (ny + pd.Timedelta(hours=4)).normalize().strftime("%Y-%m-%d")
    key = pd.Series(np.where(flags.to_numpy(), name + ":" + day, None), index=index, dtype=object)
    return key


def trading_day_keys(index: pd.DatetimeIndex, close_utc_hour: int) -> pd.Series:
    """Trading-day label with the day rolling at ``close_utc_hour`` UTC (22 = 17:00 NY for metals)."""
    shifted = index + pd.Timedelta(hours=24 - close_utc_hour) if close_utc_hour else index
    return pd.Series(shifted.strftime("%Y-%m-%d"), index=index)


def trading_week_keys(index: pd.DatetimeIndex, close_utc_hour: int) -> pd.Series:
    shifted = index + pd.Timedelta(hours=24 - close_utc_hour) if close_utc_hour else index
    iso = shifted.isocalendar()
    return pd.Series(iso["year"].astype(str).to_numpy() + "-W" + iso["week"].astype(str).str.zfill(2).to_numpy(), index=index)
