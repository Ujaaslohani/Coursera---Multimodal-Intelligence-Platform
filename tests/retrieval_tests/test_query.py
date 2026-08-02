"""Retrieval tests, per doc §7.7: cross-modal evidence ranking, timestamp
accuracy, metadata filtering, and permission-aware results.
"""
import random


def _unique_vector(dim: int) -> list[float]:
    """A fixed magic constant like [0.001]*N ties (cosine distance 0) with
    every other test run that ever used the same constant against this
    shared, persistent database (see tests/conftest.py — a real disposable
    test database isn't available in this environment). Once enough prior
    runs accumulate, an exact-match SELECT ... ORDER BY distance LIMIT top_k
    can arbitrarily tie-break away the row THIS run just inserted. A random
    vector per call can't collide with prior runs, so ranking stays
    deterministic regardless of how many times the suite has run before.
    """
    return [random.random() for _ in range(dim)]


def test_retrieval_excludes_unpermitted_sources(requires_db, monkeypatch):
    from app.database.connection import SessionLocal, Base, engine
    from app.database.models import Asset, Segment, ModalityType
    from ai.retrieval import retriever

    query_vector = _unique_vector(1536)
    monkeypatch.setattr(retriever, "embed_segment", lambda text: query_vector)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        permitted_asset = Asset(modality=ModalityType.discussion, owner="t", storage_url="x", permission_scope=["course:a"])
        restricted_asset = Asset(modality=ModalityType.discussion, owner="t", storage_url="x", permission_scope=["course:b"])
        db.add_all([permitted_asset, restricted_asset])
        db.commit()

        db.add_all([
            Segment(asset_id=permitted_asset.id, modality=ModalityType.discussion,
                    text_content="visible segment", embedding=query_vector),
            Segment(asset_id=restricted_asset.id, modality=ModalityType.discussion,
                    text_content="hidden segment", embedding=query_vector),
        ])
        db.commit()

        results = retriever.retrieve(db, "any question", permitted_sources=[permitted_asset.id], top_k=10)

        asset_ids = {r.asset_id for r in results}
        assert permitted_asset.id in asset_ids
        assert restricted_asset.id not in asset_ids
    finally:
        db.rollback()
        db.close()


def test_retrieval_text_channel_respects_top_k(requires_db, monkeypatch):
    """retriever.retrieve() intentionally does NOT truncate to top_k itself
    (see its docstring: capping the text+visual union before merging would
    silently starve whichever channel scores lower on that particular
    query). top_k is enforced by the caller (retrieval_service.run_query)
    after ai.agents.evidence_ranker has ranked the full candidate set. What
    IS still true at this layer: the text channel's own SQL query is
    limited to top_k rows before that union happens."""
    from app.database.connection import SessionLocal
    from ai.retrieval import retriever

    monkeypatch.setattr(retriever, "embed_segment", lambda text: _unique_vector(1536))

    db = SessionLocal()
    try:
        results = retriever._text_channel(db, "any question", permitted_sources=["*"], top_k=1, min_similarity=0.0)
        assert len(results) <= 1
    finally:
        db.close()


def test_run_query_service_enforces_top_k(requires_db, monkeypatch):
    """The actual guarantee callers rely on: POST /api/query's top_k is
    honored on the final response, after planning + retrieval + ranking."""
    from app.database.connection import SessionLocal
    from app.auth.dependencies import CurrentUser
    from app.services import retrieval_service
    from ai.retrieval import retriever

    monkeypatch.setattr(
        retrieval_service, "plan", lambda question, default_top_k=10: {"search_terms": question, "top_k": 2, "reasoning": "test"}
    )
    monkeypatch.setattr(retriever, "embed_segment", lambda text: _unique_vector(1536))
    monkeypatch.setattr(retriever, "embed_text_clip", lambda text: _unique_vector(512))

    db = SessionLocal()
    try:
        user = CurrentUser(user_id="test", roles=["admin"], permitted_sources=["*"])
        _, retrieved_evidence, query_plan = retrieval_service.run_query(db, user, "any question", top_k=2)
        assert query_plan["top_k"] == 2
        assert len(retrieved_evidence) <= 2
    finally:
        db.close()
