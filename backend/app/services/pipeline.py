"""Background ingestion: extract -> chunk/index, reporting progress as it goes. No AI is used here."""
from ..db import SessionLocal
from ..models import Chunk, Document
from . import analytics
from .extract import extract_pages, split


def _state(db, doc, status, stage, progress):
    doc.status, doc.stage, doc.progress = status, stage, progress
    db.commit()


def process_document(doc_id: int) -> None:
    with SessionLocal() as db:
        doc = db.get(Document, doc_id)
        if not doc:
            return
        try:
            _state(db, doc, "processing", "Reading file", 10)
            if doc.kind == "dataset":
                df = analytics.load_df(doc.path)
                doc.meta = analytics.profile(df)
                pages = [("schema", analytics.describe_text(doc.name, doc.meta)),
                         ("first 200 rows", df.head(200).to_csv(index=False))]
            else:
                pages = extract_pages(doc.path)
            if not any(t.strip() for _, t in pages):
                raise ValueError("No readable text found. Scanned PDFs need OCR before upload.")
            _state(db, doc, "processing", "Indexing passages", 45)
            chunks = split(pages)
            db.add_all(Chunk(document_id=doc.id, idx=i, locator=loc, text=t) for i, (loc, t) in enumerate(chunks))
            db.commit()
            _state(db, doc, "ready", "Ready", 100)
        except Exception as e:
            db.rollback()
            doc = db.get(Document, doc_id)
            doc.error = str(e)[:500]
            _state(db, doc, "failed", "Failed", doc.progress or 0)
