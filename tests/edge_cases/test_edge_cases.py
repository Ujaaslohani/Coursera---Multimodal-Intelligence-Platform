"""Edge cases per doc §7.7: corrupted media, missing transcripts, duplicate
assets, empty retrieval, ambiguous queries, and permission boundaries must
fail visibly and safely, never silently.
"""


def test_synthesis_with_no_evidence_is_explicit_not_hallucinated(requires_db):
    from app.database.connection import SessionLocal
    from app.services.synthesis_service import synthesize_insight
    from app.database.models import Query

    db = SessionLocal()
    try:
        query = Query(user_id="test-user", question_text="Unanswerable question")
        db.add(query)
        db.commit()
        db.refresh(query)

        insight = synthesize_insight(db, query.id, retrieved_evidence=[])

        assert insight.confidence == 0.0
        assert insight.citations == []
        assert "insufficient" in insight.answer_text.lower()
    finally:
        db.rollback()
        db.close()


def test_embedding_refresh_skips_segments_with_no_text(requires_db):
    from app.database.connection import SessionLocal
    from app.database.models import Asset, Segment, ModalityType
    from app.services.embedding_service import refresh_embeddings

    db = SessionLocal()
    try:
        asset = Asset(modality=ModalityType.video, owner="t", storage_url="x")
        db.add(asset)
        db.commit()

        # Simulates a video where transcript alignment failed and text_content is empty.
        empty_segment = Segment(asset_id=asset.id, modality=ModalityType.video, text_content=None)
        db.add(empty_segment)
        db.commit()

        updated_count = refresh_embeddings(db, [empty_segment.id])

        assert updated_count == 0  # must not embed empty text or crash
    finally:
        db.rollback()
        db.close()


def test_processing_job_not_found_returns_404(requires_db, auth_headers):
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/processing-jobs/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert response.status_code == 404


def test_insight_not_found_returns_404(requires_db, auth_headers):
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/insights/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert response.status_code == 404


def test_duplicate_asset_registration_is_flagged(requires_db, auth_headers):
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    payload = {
        "modality": "transcript",
        "owner": "dup-test@coursera.org",
        "storage_url": "data/sample_assets/course_neural_networks/transcript.json",
    }

    first = client.post("/api/assets", json=payload, headers=auth_headers)
    second = client.post("/api/assets", json=payload, headers=auth_headers)

    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["duplicate"] is False
    assert second.json()["duplicate"] is True
    assert second.json()["asset_id"] == first.json()["asset_id"]
