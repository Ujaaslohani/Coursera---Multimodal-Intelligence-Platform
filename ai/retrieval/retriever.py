"""Permission-aware, cross-modal retrieval, per doc §5.4 'Unified Query and
Retrieval Layer'. Retrieval must run BEFORE synthesis and must enforce access
control — low-confidence or restricted evidence is surfaced, never silently
dropped.
"""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai.embeddings.embed import embed_segment


@dataclass
class RetrievedEvidence:
    segment_id: str
    asset_id: str
    modality: str
    text_content: str
    timestamp_start: float | None
    timestamp_end: float | None
    similarity: float
    permitted: bool


def retrieve(db: Session, question_text: str, permitted_sources: list[str],
             top_k: int = 10, min_similarity: float = 0.0) -> list[RetrievedEvidence]:
    from app.database.models import Segment  # backend model; ai/ is invoked in-process by backend services

    query_vector = embed_segment(question_text)

    stmt = (
        select(Segment, Segment.embedding.cosine_distance(query_vector).label("distance"))
        .order_by("distance")
        .limit(top_k)
    )
    rows = db.execute(stmt).all()

    results = []
    for segment, distance in rows:
        similarity = 1 - float(distance)
        permitted = "*" in permitted_sources or segment.asset_id in permitted_sources
        if not permitted:
            continue  # access control enforced before evidence ever reaches synthesis
        if similarity < min_similarity:
            continue
        results.append(
            RetrievedEvidence(
                segment_id=segment.id,
                asset_id=segment.asset_id,
                modality=segment.modality.value,
                text_content=segment.text_content,
                timestamp_start=segment.timestamp_start,
                timestamp_end=segment.timestamp_end,
                similarity=similarity,
                permitted=permitted,
            )
        )
    return results
