from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.auth.dependencies import get_current_user, CurrentUser
from app.services.synthesis_service import synthesize_insight

router = APIRouter()


class SynthesizeRequest(BaseModel):
    query_id: str
    retrieved_evidence: list[dict]


class SynthesizeResponse(BaseModel):
    insight_id: str
    answer_text: str
    citations: list[dict]
    confidence: float | None
    status: str


@router.post("/api/synthesize", response_model=SynthesizeResponse)
def synthesize_endpoint(
    payload: SynthesizeRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Generate a grounded insight pack — citations, confidence, and a
    review-ready recommendation — from retrieved evidence only."""
    insight = synthesize_insight(db, payload.query_id, payload.retrieved_evidence)
    return SynthesizeResponse(
        insight_id=insight.id,
        answer_text=insight.answer_text,
        citations=insight.citations,
        confidence=insight.confidence,
        status=insight.status,
    )
