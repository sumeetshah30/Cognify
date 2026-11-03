"""Safe dataset analysis. Column names are validated against the frame; nothing is eval'd."""
import math
from pathlib import Path

import pandas as pd

AGGS = {"sum", "mean", "count", "min", "max", "median"}
_cache: dict[tuple[str, float], pd.DataFrame] = {}


def load_df(path: str) -> pd.DataFrame:
    key = (path, Path(path).stat().st_mtime)
    if key in _cache:
        return _cache[key]
    if path.lower().endswith(".csv"):
        try:
            df = pd.read_csv(path, low_memory=False)
        except UnicodeDecodeError:
            df = pd.read_csv(path, low_memory=False, encoding="latin-1")
    else:
        df = pd.read_excel(path)
    df.columns = [str(c).strip() for c in df.columns]
    if len(_cache) > 8:
        _cache.clear()
    _cache[key] = df
    return df


def _num(v):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return float(v)


def profile(df: pd.DataFrame) -> dict:
    cols = []
    for c in df.columns:
        s = df[c]
        info = {
            "name": c,
            "dtype": "number" if pd.api.types.is_numeric_dtype(s) else
                     "date" if pd.api.types.is_datetime64_any_dtype(s) else "text",
            "nulls": int(s.isna().sum()),
            "unique": int(s.nunique(dropna=True)),
            "sample": [str(v) for v in s.dropna().head(3).tolist()],
        }
        if info["dtype"] == "number" and s.notna().any():
            info.update(min=_num(s.min()), max=_num(s.max()), mean=_num(s.mean()), median=_num(s.median()))
        cols.append(info)
    return {"rows": int(len(df)), "columns": cols}


def describe_text(name: str, prof: dict) -> str:
    parts = [f"Dataset {name} has {prof['rows']} rows and {len(prof['columns'])} columns."]
    for c in prof["columns"]:
        extra = f", range {c['min']} to {c['max']}, mean {c['mean']:.4g}" if "min" in c and c["mean"] is not None else ""
        parts.append(f"Column '{c['name']}' ({c['dtype']}, {c['unique']} unique, {c['nulls']} missing{extra}); e.g. {', '.join(c['sample'])}.")
    return " ".join(parts)


def _col(df: pd.DataFrame, name: str | None) -> str:
    if not name or name not in df.columns:
        raise ValueError(f"Column '{name}' not found. Available: {', '.join(map(str, df.columns))}")
    return name


def aggregate(df: pd.DataFrame, x: str, y: str | None, agg: str = "sum", limit: int = 30, sort_by_x: bool = False) -> dict:
    x = _col(df, x)
    if agg not in AGGS:
        raise ValueError(f"agg must be one of {sorted(AGGS)}")
    if agg == "count" or not y:
        g = df.groupby(x, dropna=False).size().rename("value")
    else:
        y = _col(df, y)
        if not pd.api.types.is_numeric_dtype(df[y]):
            raise ValueError(f"'{y}' is not numeric, so '{agg}' can't be computed. Use agg='count'.")
        g = df.groupby(x, dropna=False)[y].agg(agg).rename("value")
    g = g.sort_index() if sort_by_x else g.sort_values(ascending=False)
    g = g.head(limit).reset_index()
    return {"labels": [str(v) for v in g[x]], "values": [_num(v) for v in g["value"]]}


def histogram(df: pd.DataFrame, col: str, bins: int = 20) -> dict:
    s = pd.to_numeric(df[_col(df, col)], errors="coerce").dropna()
    if s.empty:
        raise ValueError(f"'{col}' has no numeric values.")
    cut = pd.cut(s, bins=min(max(bins, 2), 60))
    counts = cut.value_counts(sort=False)
    return {"labels": [f"{iv.left:.4g}–{iv.right:.4g}" for iv in counts.index], "values": [int(v) for v in counts.values]}


def scatter(df: pd.DataFrame, x: str, y: str, limit: int = 600) -> dict:
    d = df[[_col(df, x), _col(df, y)]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(d) > limit:
        d = d.sample(limit, random_state=1)
    return {"points": [{"x": float(a), "y": float(b)} for a, b in zip(d[x], d[y])]}
