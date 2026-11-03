from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Document, QueryLog, Report, User
from ..security import current_user
from ..services import ai
from ..services.search import search_chunks
from .library import get_owned

router = APIRouter(prefix="/api", tags=["intelligence"])


class Ask(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    document_ids: list[int] | None = None


@router.post("/ask")
def ask(body: Ask, db: Session = Depends(get_db), user: User = Depends(current_user)):
    passages = search_chunks(db, user.id, body.question, 8, body.document_ids)
    text, sources = ai.answer(body.question, passages)
    db.add(QueryLog(owner_id=user.id, question=body.question, answer=text, sources=sources))
    db.commit()
    return {"answer": text, "sources": sources}


@router.get("/history")
def history(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(QueryLog).filter_by(owner_id=user.id).order_by(QueryLog.id.desc()).limit(30).all()
    return [{"id": r.id, "question": r.question, "answer": r.answer, "sources": r.sources,
             "created_at": r.created_at} for r in rows]


@router.get("/search")
def search(q: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return [{**h, "text": h["text"][:400]} for h in search_chunks(db, user.id, q, 12)]


class Compare(BaseModel):
    a: int
    b: int
    focus: str = ""


def _text(d: Document) -> str:
    return " ".join(c.text for c in sorted(d.chunks, key=lambda c: c.idx))


@router.post("/compare")
def compare(body: Compare, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if body.a == body.b:
        raise HTTPException(422, "Pick two different files.")
    a, b = get_owned(db, user, body.a), get_owned(db, user, body.b)
    if a.status != "ready" or b.status != "ready":
        raise HTTPException(409, "Both files must finish processing first.")
    return {"comparison": ai.compare(a.name, _text(a), b.name, _text(b), body.focus)}


class ReportReq(BaseModel):
    title: str = Field(default="Untitled report", max_length=250)
    instructions: str = Field(min_length=3, max_length=3000)
    document_ids: list[int] = Field(min_length=1, max_length=10)


@router.post("/reports")
def create_report(body: ReportReq, db: Session = Depends(get_db), user: User = Depends(current_user)):
    parts = []
    for i in body.document_ids:
        d = get_owned(db, user, i)
        if d.status != "ready":
            raise HTTPException(409, f"{d.name} is still processing.")
        parts.append(f"## {d.name}\nSummary: {d.summary}\n{_text(d)[:8000]}")
    md = ai.report(body.instructions, "\n\n".join(parts))
    r = Report(owner_id=user.id, title=body.title, body=md)
    db.add(r)
    db.commit()
    return {"id": r.id}


@router.get("/reports")
def list_reports(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(Report).filter_by(owner_id=user.id).order_by(Report.id.desc()).all()
    return [{"id": r.id, "title": r.title, "body": r.body, "created_at": r.created_at} for r in rows]


@router.delete("/reports/{rid}", status_code=204)
def delete_report(rid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    r = db.get(Report, rid)
    if not r or r.owner_id != user.id:
        raise HTTPException(404, "Report not found.")
    db.delete(r)
    db.commit()
