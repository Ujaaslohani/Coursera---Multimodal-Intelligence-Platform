"""Retrieval tests, per doc §7.7: cross-modal evidence ranking, timestamp
accuracy, metadata filtering, and permission-aware results.
"""


def test_retrieval_excludes_unpermitted_sources(requires_db, monkeypatch):
    from app.database.connection import SessionLocal, Base, engine
    from app.database.models import Asset, Segment, ModalityType
    from ai.retrieval import retriever

    # Avoid real OpenAI calls in this test — return a fixed vector regardless of input text.
    monkeypatch.setattr(retriever, "embed_segment", lambda text: [0.001] * 1536)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        permitted_asset = Asset(modality=ModalityType.discussion, owner="t", storage_url="x", permission_scope=["course:a"])
        restricted_asset = Asset(modality=ModalityType.discussion, owner="t", storage_url="x", permission_scope=["course:b"])
        db.add_all([permitted_asset, restricted_asset])
        db.commit()

        db.add_all([
            Segment(asset_id=permitted_asset.id, modality=ModalityType.discussion,
                    text_content="visible segment", embedding=[0.001] * 1536),
            Segment(asset_id=restricted_asset.id, modality=ModalityType.discussion,
                    text_content="hidden segment", embedding=[0.001] * 1536),
        ])
        db.commit()

        results = retriever.retrieve(db, "any question", permitted_sources=[permitted_asset.id], top_k=10)

        asset_ids = {r.asset_id for r in results}
        assert permitted_asset.id in asset_ids
        assert restricted_asset.id not in asset_ids
    finally:
        db.rollback()
        db.close()


def test_retrieval_respects_top_k(requires_db, monkeypatch):
    from app.database.connection import SessionLocal
    from ai.retrieval import retriever

    monkeypatch.setattr(retriever, "embed_segment", lambda text: [0.001] * 1536)

    db = SessionLocal()
    try:
        results = retriever.retrieve(db, "any question", permitted_sources=["*"], top_k=1)
        assert len(results) <= 1
    finally:
        db.close()
