"""Agent runs + a Server-Sent Events stream that pushes file status and agent progress to the browser."""
import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import SessionLocal, get_db
from ..models import AgentRun, Document, User
from ..security import current_user, user_from_token
from ..services.agent import run_agent

router = APIRouter(prefix="/api", tags=["live"])


class Goal(BaseModel):
    goal: str = Field(min_length=5, max_length=3000)


@router.post("/agent/runs", status_code=202)
def start(body: Goal, bg: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(current_user)):
    running = db.query(AgentRun).filter_by(owner_id=user.id, status="running").count()
    if running >= 2:
        raise HTTPException(429, "Two agent runs are already in progress. Wait for one to finish.")
    run = AgentRun(owner_id=user.id, goal=body.goal)
    db.add(run)
    db.commit()
    bg.add_task(run_agent, run.id)
    return {"id": run.id}


def _snapshot(uid: int) -> dict:
    with SessionLocal() as db:
        docs = db.query(Document).filter_by(owner_id=uid).order_by(Document.id.desc()).all()
        runs = db.query(AgentRun).filter_by(owner_id=uid).order_by(AgentRun.id.desc()).limit(15).all()
        return {
            "documents": [{"id": d.id, "name": d.name, "kind": d.kind, "size": d.size, "status": d.status,
                           "stage": d.stage, "progress": d.progress, "error": d.error, "summary": d.summary,
                           "meta": d.meta, "created_at": d.created_at.isoformat()} for d in docs],
            "runs": [{"id": r.id, "goal": r.goal, "status": r.status, "steps": r.steps or [], "result": r.result,
                      "created_at": r.created_at.isoformat()} for r in runs],
        }


@router.get("/events")
async def events(request: Request, token: str):
    """EventSource can't send headers, so the JWT arrives as a query parameter. Serve over HTTPS and keep logs scrubbed."""
    def auth():
        with SessionLocal() as db:
            return user_from_token(token, db).id
    uid = await run_in_threadpool(auth)

    async def gen():
        last = None
        while not await request.is_disconnected():
            data = json.dumps(await run_in_threadpool(_snapshot, uid))
            if data != last:
                last = data
                yield f"data: {data}\n\n"
            else:
                yield ": keep-alive\n\n"
            await asyncio.sleep(1.2)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
