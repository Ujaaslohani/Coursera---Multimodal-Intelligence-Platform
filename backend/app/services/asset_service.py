from sqlalchemy.orm import Session

from app.database.models import Asset, ProcessingJob
from app.jobs.job_queue import create_job


def find_duplicate(db: Session, owner: str, modality: str, storage_url: str) -> Asset | None:
    """Same owner + modality + storage_url is treated as a re-registration of
    the same source, per doc §5.4 'Input validation must detect ... duplicate
    assets.' Deliberately narrow (not fuzzy-matching content) to avoid false
    positives across genuinely different assets that happen to share a topic.
    """
    return (
        db.query(Asset)
        .filter(Asset.owner == owner, Asset.modality == modality, Asset.storage_url == storage_url)
        .first()
    )


def register_asset(db: Session, modality: str, owner: str, topic: str | None,
                    concept_tags: list[str], storage_url: str,
                    permission_scope: list[str]) -> tuple[Asset, str, bool]:
    """Returns (asset, job_id, is_duplicate)."""
    existing = find_duplicate(db, owner, modality, storage_url)
    if existing is not None:
        latest_job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.asset_id == existing.id)
            .order_by(ProcessingJob.created_at.desc())
            .first()
        )
        return existing, (latest_job.id if latest_job else create_job(db, existing.id).id), True

    asset = Asset(
        modality=modality,
        owner=owner,
        topic=topic,
        concept_tags=concept_tags,
        storage_url=storage_url,
        permission_scope=permission_scope,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    job = create_job(db, asset.id)
    return asset, job.id, False
