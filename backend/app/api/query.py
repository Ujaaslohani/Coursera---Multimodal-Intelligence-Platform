from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.auth.dependencies import get_current_user, CurrentUser
from app.services.retrieval_service import run_query

router = APIRouter()


class QueryRequest(BaseModel):
    question_text: str
    top_k: int = 10


class QueryResponse(BaseModel):
    query_id: str
    retrieved_evidence: list[dict]


@router.post("/api/query", response_model=QueryResponse)
def submit_query(
    payload: QueryRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Accept a unified user question and run permission-aware retrieval across modalities."""
    query, retrieved_evidence = run_query(db, user, payload.question_text, top_k=payload.top_k)
    return QueryResponse(query_id=query.id, retrieved_evidence=retrieved_evidence)
