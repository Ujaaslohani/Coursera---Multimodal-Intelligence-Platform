from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.auth.dependencies import get_current_user, CurrentUser
from app.services.embedding_service import refresh_embeddings

router = APIRouter()


class EmbeddingRefreshRequest(BaseModel):
    segment_ids: list[str]


class EmbeddingRefreshResponse(BaseModel):
    updated_count: int


@router.post("/api/embeddings", response_model=EmbeddingRefreshResponse)
def generate_embeddings(
    payload: EmbeddingRefreshRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Generate or refresh embeddings for approved asset segments."""
    updated = refresh_embeddings(db, payload.segment_ids)
    return EmbeddingRefreshResponse(updated_count=updated)
