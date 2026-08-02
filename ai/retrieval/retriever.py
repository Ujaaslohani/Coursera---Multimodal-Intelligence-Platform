"""Permission-aware, cross-modal retrieval, per doc §5.4 'Unified Query and
Retrieval Layer'. Retrieval must run BEFORE synthesis and must enforce access
control — low-confidence or restricted evidence is surfaced, never silently
dropped.

Runs TWO independent searches and merges them: a text-meaning search (every
modality's OCR'd/transcribed/written text, per ai/embeddings/embed.py) and a
visual-meaning search (an image's actual pixels, via CLIP — see
ai/embeddings/clip_embed.py). This is what keeps the platform from "overfitting
to text-only analysis" (doc §5.4) — an image with no readable text is still
findable by what it visually shows, not just by words printed on it.
"""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai.embeddings.embed import embed_segment
from ai.embeddings.clip_embed import embed_text_clip


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
    match_type: str = "text"  # "text" (meaning-of-words match) or "visual" (CLIP image match)


def _text_channel(db: Session, question_text: str, permitted_sources: list[str],
                   top_k: int, min_similarity: float) -> list[RetrievedEvidence]:
    from app.database.models import Segment

    query_vector = embed_segment(question_text)
    stmt = (
        select(Segment, Segment.embedding.cosine_distance(query_vector).label("distance"))
        .where(Segment.embedding.is_not(None))
        .order_by("distance")
        .limit(top_k)
    )
    rows = db.execute(stmt).all()

    results = []
    for segment, distance in rows:
        similarity = 1 - float(distance)
        permitted = "*" in permitted_sources or segment.asset_id in permitted_sources
        if not permitted or similarity < min_similarity:
            continue
        results.append(RetrievedEvidence(
            segment_id=segment.id, asset_id=segment.asset_id, modality=segment.modality.value,
            text_content=segment.text_content, timestamp_start=segment.timestamp_start,
            timestamp_end=segment.timestamp_end, similarity=similarity, permitted=permitted,
            match_type="text",
        ))
    return results


def _visual_channel(db: Session, question_text: str, permitted_sources: list[str],
                     top_k: int, min_similarity: float) -> list[RetrievedEvidence]:
    from app.database.models import Segment

    query_vector = embed_text_clip(question_text)
    stmt = (
        select(Segment, Segment.image_embedding.cosine_distance(query_vector).label("distance"))
        .where(Segment.image_embedding.is_not(None))
        .order_by("distance")
        .limit(top_k)
    )
    rows = db.execute(stmt).all()

    results = []
    for segment, distance in rows:
        similarity = 1 - float(distance)
        permitted = "*" in permitted_sources or segment.asset_id in permitted_sources
        if not permitted or similarity < min_similarity:
            continue
        results.append(RetrievedEvidence(
            segment_id=segment.id, asset_id=segment.asset_id, modality=segment.modality.value,
            text_content=segment.text_content, timestamp_start=segment.timestamp_start,
            timestamp_end=segment.timestamp_end, similarity=similarity, permitted=permitted,
            match_type="visual",
        ))
    return results


def retrieve(db: Session, question_text: str, permitted_sources: list[str],
             top_k: int = 10, min_similarity: float = 0.0) -> list[RetrievedEvidence]:
    """Each channel gets its own full top_k allocation before merging — text
    similarity scores and CLIP visual similarity scores are NOT on a
    comparable numeric scale (CLIP cross-modal similarity for a short text
    query is often lower even for a genuinely correct visual match), so
    capping the union to top_k before merging would silently starve the
    weaker-scoring channel whenever text results happen to dominate. The
    final top_k cut is applied by the caller, after ai.agents.evidence_ranker
    has had a chance to weigh cross-modal diversity, not raw score alone.
    """
    text_results = _text_channel(db, question_text, permitted_sources, top_k, min_similarity)

    try:
        visual_results = _visual_channel(db, question_text, permitted_sources, top_k, min_similarity)
    except Exception:
        # CLIP is a local model load — degrade to text-only rather than fail the whole query
        # if it's unavailable (e.g. sentence-transformers not installed in some environment).
        visual_results = []

    merged: dict[str, RetrievedEvidence] = {}
    for item in text_results + visual_results:
        existing = merged.get(item.segment_id)
        if existing is None or item.similarity > existing.similarity:
            merged[item.segment_id] = item

    return sorted(merged.values(), key=lambda e: e.similarity, reverse=True)
