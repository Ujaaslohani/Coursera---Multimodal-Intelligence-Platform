from sqlalchemy.orm import Session

from app.database.models import Insight, Query
from ai.synthesis.synthesizer import synthesize
from ai.retrieval.retriever import RetrievedEvidence


# NOTE: prompting, citation assembly, and grounding checks live in ai/synthesis.
# This service is the backend orchestration boundary for POST /api/synthesize,
# per doc §5.4 "LLM Synthesis and Recommendation Generation": the model must
# receive only retrieved evidence, and outputs must include citations,
# confidence notes, and recommended actions for review.


def synthesize_insight(db: Session, query_id: str, retrieved_evidence: list[dict]) -> Insight:
    if not retrieved_evidence:
        answer_text = "Insufficient evidence retrieved to synthesize a grounded insight."
        citations: list[dict] = []
        confidence = 0.0
    else:
        question = db.query(Query).filter(Query.id == query_id).first()
        evidence_objs = [RetrievedEvidence(**e) for e in retrieved_evidence]
        result = synthesize(question.question_text if question else "", evidence_objs)
        answer_text = result.get("answer", "")
        citations = result.get("citations", [])
        confidence = result.get("confidence")

    insight = Insight(
        query_id=query_id,
        answer_text=answer_text,
        citations=citations,
        confidence=confidence,
        status="pending_review",
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight


def get_insight(db: Session, insight_id: str) -> Insight | None:
    return db.query(Insight).filter(Insight.id == insight_id).first()
