"""BM25 passage retrieval over a user's chunks. Swap for SQL Server full-text or a vector index at scale."""
import re
from collections import Counter
from math import log

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Chunk, Document

_tok = re.compile(r"[a-z0-9]{2,}")


def tokenize(s: str) -> list[str]:
    return _tok.findall(s.lower())


def search_chunks(db: Session, owner_id: int, query: str, k: int = 6, doc_ids: list[int] | None = None) -> list[dict]:
    q = select(Chunk, Document.name).join(Document, Document.id == Chunk.document_id).where(
        Document.owner_id == owner_id, Document.status == "ready")
    if doc_ids:
        q = q.where(Document.id.in_(doc_ids))
    rows = db.execute(q).all()
    if not rows:
        return []
    qt = tokenize(query)
    docs = [tokenize(c.text) for c, _ in rows]
    n, avg = len(docs), sum(map(len, docs)) / len(docs) or 1
    df: Counter = Counter()
    for d in docs:
        df.update(set(d))
    scored = []
    for (c, name), d in zip(rows, docs):
        tf, s = Counter(d), 0.0
        for t in qt:
            if t in tf:
                idf = log(1 + (n - df[t] + 0.5) / (df[t] + 0.5))
                s += idf * tf[t] * 2.5 / (tf[t] + 1.5 * (0.25 + 0.75 * len(d) / avg))
        if s > 0:
            scored.append((s, c, name))
    scored.sort(key=lambda r: r[0], reverse=True)
    return [{"document_id": c.document_id, "document_name": name, "locator": c.locator,
             "text": c.text, "score": round(s, 3)} for s, c, name in scored[:k]]
