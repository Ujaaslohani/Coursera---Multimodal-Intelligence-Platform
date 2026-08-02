"""ORM models for the multimodal pipeline, per doc §6.3 data assets and the
JSON Schemas in data/schemas/. Every table carries the source-lineage fields
(owner, topic, permission_scope / permitted checks downstream) required to
keep every synthesized insight traceable back to its evidence.

NOTE: the target Supabase database was already seeded by an earlier working
version of this codebase — native `uuid` id columns and Postgres enum types
`modalitytype` / `jobstage` already exist, with rows in every table. These
models match that existing physical schema exactly (native UUID ids, enum
type names without underscores) so Base.metadata.create_all() is a safe
no-op here, and a genuine CREATE on a fresh database (enum DDL is checkfirst
by default, so it works against both).
"""
import enum
import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, Enum as SAEnum, Float, ForeignKey, JSON, Text, Uuid

from app.database.connection import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ModalityType(str, enum.Enum):
    video = "video"
    image = "image"
    slide = "slide"
    transcript = "transcript"
    quiz = "quiz"
    discussion = "discussion"


class JobStage(str, enum.Enum):
    uploaded = "uploaded"
    preprocessed = "preprocessed"
    embedded = "embedded"
    indexed = "indexed"
    failed = "failed"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=_uuid)
    modality = Column(SAEnum(ModalityType, name="modalitytype"), nullable=False)
    owner = Column(Text, nullable=False)
    topic = Column(Text, nullable=True)
    concept_tags = Column(JSON, nullable=True, default=list)
    storage_url = Column(Text, nullable=False)
    permission_scope = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, default=_now)


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=_uuid)
    asset_id = Column(Uuid(as_uuid=False), ForeignKey("assets.id"), nullable=False)
    stage = Column(SAEnum(JobStage, name="jobstage"), default=JobStage.uploaded)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=_uuid)
    asset_id = Column(Uuid(as_uuid=False), ForeignKey("assets.id"), nullable=False)
    modality = Column(SAEnum(ModalityType, name="modalitytype"), nullable=False)
    text_content = Column(Text, nullable=True)
    timestamp_start = Column(Float, nullable=True)
    timestamp_end = Column(Float, nullable=True)
    embedding = Column(Vector(1536), nullable=True)  # matches ai/embeddings/embed.py EMBEDDING_MODEL dims
    segment_metadata = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=_now)


class Query(Base):
    __tablename__ = "queries"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=_uuid)
    user_id = Column(Text, nullable=False)
    question_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=_uuid)
    query_id = Column(Uuid(as_uuid=False), ForeignKey("queries.id"), nullable=False)
    answer_text = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True, default=list)
    confidence = Column(Float, nullable=True)
    status = Column(Text, default="pending_review")  # pending_review|accept|edit|reject|escalate
    created_at = Column(DateTime, default=_now)


class ReviewFeedback(Base):
    __tablename__ = "review_feedback"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=_uuid)
    insight_id = Column(Uuid(as_uuid=False), ForeignKey("insights.id"), nullable=False)
    reviewer_id = Column(Text, nullable=False)
    decision = Column(Text, nullable=False)  # accept | edit | reject | escalate
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)
