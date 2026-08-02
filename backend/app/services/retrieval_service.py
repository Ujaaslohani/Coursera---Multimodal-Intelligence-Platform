from dataclasses import asdict

from sqlalchemy.orm import Session

from app.database.models import Query
from app.auth.dependencies import CurrentUser
from ai.retrieval.retriever import retrieve


def run_query(db: Session, user: CurrentUser, question_text: str, top_k: int = 10) -> tuple[Query, list[dict]]:
    query = Query(user_id=user.user_id, question_text=question_text)
    db.add(query)
    db.commit()
    db.refresh(query)

    # Retrieval enforces access control before evidence ever reaches synthesis,
    # per doc §5.4 "Unified Query and Retrieval Layer".
    evidence = retrieve(db, question_text, user.permitted_sources, top_k=top_k)
    retrieved_evidence = [asdict(e) for e in evidence]

    return query, retrieved_evidence
