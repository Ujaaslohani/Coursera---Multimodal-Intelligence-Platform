from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.auth.dependencies import get_current_user, CurrentUser
from app.services.asset_service import register_asset

router = APIRouter()


class AssetCreateRequest(BaseModel):
    modality: str  # video | image | slide | transcript | quiz | discussion
    owner: str
    topic: str | None = None
    concept_tags: list[str] = []
    storage_url: str
    permission_scope: list[str] = []


class AssetCreateResponse(BaseModel):
    asset_id: str
    job_id: str
    status: str = "uploaded"
    duplicate: bool = False


@router.post("/api/assets", response_model=AssetCreateResponse)
def create_asset(
    payload: AssetCreateRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Register a new video, image, slide, transcript, quiz, or discussion asset.
    Re-registering the same owner+modality+storage_url returns the existing
    asset instead of creating a duplicate (doc §5.4 duplicate-asset detection)."""
    asset, job_id, is_duplicate = register_asset(
        db,
        modality=payload.modality,
        owner=payload.owner,
        topic=payload.topic,
        concept_tags=payload.concept_tags,
        storage_url=payload.storage_url,
        permission_scope=payload.permission_scope,
    )
    return AssetCreateResponse(
        asset_id=asset.id,
        job_id=job_id,
        status="duplicate" if is_duplicate else "uploaded",
        duplicate=is_duplicate,
    )
