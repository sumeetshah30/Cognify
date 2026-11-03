from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Unicode, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(Unicode(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(Unicode(120))
    password_hash: Mapped[str] = mapped_column(Unicode(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Document(Base):
    """An uploaded file. kind = 'document' (pdf/docx/txt/md) or 'dataset' (csv/xlsx)."""
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(Unicode(255))
    kind: Mapped[str] = mapped_column(Unicode(20))
    path: Mapped[str] = mapped_column(Unicode(500))
    size: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(Unicode(20), default="queued")  # queued|processing|ready|failed
    stage: Mapped[str] = mapped_column(Unicode(60), default="Waiting in queue")
    progress: Mapped[int] = mapped_column(default=0)
    error: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # dataset profile
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    chunks: Mapped[list["Chunk"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    idx: Mapped[int]
    locator: Mapped[str] = mapped_column(Unicode(60))
    text: Mapped[str] = mapped_column(UnicodeText)


class QueryLog(Base):
    __tablename__ = "query_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    question: Mapped[str] = mapped_column(UnicodeText)
    answer: Mapped[str] = mapped_column(UnicodeText)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(Unicode(255))
    body: Mapped[str] = mapped_column(UnicodeText)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    goal: Mapped[str] = mapped_column(UnicodeText)
    status: Mapped[str] = mapped_column(Unicode(20), default="running")  # running|done|failed
    steps: Mapped[list] = mapped_column(JSON, default=list)
    result: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
