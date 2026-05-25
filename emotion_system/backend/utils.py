"""Shared backend utilities."""
from datetime import datetime, timezone


def parse_dt(val):
    """Convert ISO string or None to datetime; fall back to now."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)
