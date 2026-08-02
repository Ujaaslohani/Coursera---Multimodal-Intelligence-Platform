"""Bridges pipeline output into the searchable index, per doc §5.4
'Embedding and Multimodal Indexing'. Takes raw units from a
video/image/text_processing step, normalizes them via ai/preprocessing,
writes Segment rows, embeds them via ai/embeddings, and advances the
processing job to 'indexed'.
"""
from sqlalchemy.orm import Session

from app.database.models import Segment, JobStage
from app.jobs.job_queue import advance_job
from ai.preprocessing.normalize import normalize_raw_units
from ai.embeddings.embed import embed_segment


def index_pipeline_output(db: Session, job_id: str, pipeline_output: dict,
                           permission_scope: list[str] | None = None) -> list[str]:
    """pipeline_output: the dict returned by video_processing/image_processing/
    text_processing (asset_id, modality, raw_units)."""
    normalized = normalize_raw_units(
        asset_id=pipeline_output["asset_id"],
        modality=pipeline_output["modality"],
        raw_units=pipeline_output["raw_units"],
        permission_scope=permission_scope,
    )

    segment_ids = []
    for seg in normalized:
        record = Segment(
            asset_id=seg.asset_id,
            job_id=job_id,
            modality=seg.modality,
            text_content=seg.text_content,
            timestamp_start=seg.timestamp_start,
            timestamp_end=seg.timestamp_end,
            embedding=embed_segment(seg.text_content),
            segment_metadata=seg.metadata,
        )
        db.add(record)
        db.flush()
        segment_ids.append(record.id)

    db.commit()
    advance_job(db, job_id, JobStage.indexed)
    return segment_ids
