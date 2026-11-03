import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import Document, User
from ..security import current_user
from ..services import ai, analytics
from ..services.extract import kind_for
from ..services.pipeline import process_document

router = APIRouter(prefix="/api", tags=["library"])


def get_owned(db: Session, user: User, doc_id: int, kind: str | None = None) -> Document:
    d = db.get(Document, doc_id)
    if not d or d.owner_id != user.id or (kind and d.kind != kind):
        raise HTTPException(404, "File not found.")
    return d


@router.post("/documents", status_code=202)
async def upload(bg: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db),
                 user: User = Depends(current_user)):
    name = Path(file.filename or "upload").name
    kind = kind_for(name)
    if not kind:
        raise HTTPException(415, "Unsupported file type. Use PDF, DOCX, TXT, MD, CSV or XLSX.")
    folder = Path(settings.upload_dir) / str(user.id)
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / f"{uuid.uuid4().hex}{Path(name).suffix.lower()}"
    size, limit = 0, settings.max_upload_mb * 1024 * 1024
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                f.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, f"File is larger than {settings.max_upload_mb} MB.")
            f.write(chunk)
    doc = Document(owner_id=user.id, name=name, kind=kind, path=str(dest), size=size)
    db.add(doc)
    db.commit()
    bg.add_task(process_document, doc.id)
    return {"id": doc.id}


@router.delete("/documents/{doc_id}", status_code=204)
def delete(doc_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = get_owned(db, user, doc_id)
    Path(d.path).unlink(missing_ok=True)
    db.delete(d)
    db.commit()


class ChartReq(BaseModel):
    kind: str  # bar | line | histogram | scatter
    x: str
    y: str | None = None
    agg: str = "sum"


@router.post("/datasets/{doc_id}/chart")
def chart(doc_id: int, body: ChartReq, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = get_owned(db, user, doc_id, "dataset")
    if d.status != "ready":
        raise HTTPException(409, "This dataset is still processing.")
    df = analytics.load_df(d.path)
    try:
        if body.kind in ("bar", "line"):
            return analytics.aggregate(df, body.x, body.y, body.agg, 40, sort_by_x=body.kind == "line")
        if body.kind == "histogram":
            return analytics.histogram(df, body.x)
        if body.kind == "scatter":
            return analytics.scatter(df, body.x, body.y or "")
    except ValueError as e:
        raise HTTPException(422, str(e))
    raise HTTPException(422, "Chart type must be bar, line, histogram or scatter.")


@router.post("/datasets/{doc_id}/insights")
def insights(doc_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    d = get_owned(db, user, doc_id, "dataset")
    if d.status != "ready":
        raise HTTPException(409, "This dataset is still processing.")
    df = analytics.load_df(d.path)
    return {"insights": ai.insights(d.name, analytics.describe_text(d.name, d.meta), df.head(15).to_csv(index=False))}
