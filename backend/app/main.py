from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, SessionLocal, engine
from .models import AgentRun, Document
from .routes import auth, intelligence, library, live


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)  # use Alembic migrations for production schema changes
    Path(settings.upload_dir).mkdir(exist_ok=True)
    with SessionLocal() as db:  # work interrupted by a restart can't resume, so mark it failed
        for d in db.query(Document).filter(Document.status.in_(["queued", "processing"])):
            d.status, d.stage, d.error = "failed", "Failed", "Server restarted during processing. Delete and upload again."
        for r in db.query(AgentRun).filter_by(status="running"):
            r.status, r.result = "failed", "Server restarted during this run."
        db.commit()
    yield


app = FastAPI(title="Cognify API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])
for r in (auth.router, library.router, intelligence.router, live.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"ok": True}
