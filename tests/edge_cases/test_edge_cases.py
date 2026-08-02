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


def test_rbac_rejects_out_of_scope_role(requires_db, educator_headers):
    """An `educator` token (permissions: query:run, insights:read) must be
    rejected from review-feedback (requires review:write) and from asset
    registration (requires assets:write) — RBAC per doc §5.4."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    review_response = client.post(
        "/api/review-feedback",
        json={"insight_id": "00000000-0000-0000-0000-000000000000", "decision": "accept"},
        headers=educator_headers,
    )
    assert review_response.status_code == 403

    asset_response = client.post(
        "/api/assets",
        json={"modality": "transcript", "owner": "rbac-test@coursera.org", "storage_url": "x"},
        headers=educator_headers,
    )
    assert asset_response.status_code == 403


def test_duplicate_asset_registration_is_flagged(requires_db, auth_headers):
    import uuid

    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    # Unique owner per run — see test_register_asset_creates_job for why a
    # fixed value would only pass once against a real, persistent database.
    payload = {
        "modality": "transcript",
        "owner": f"dup-test-{uuid.uuid4()}@coursera.org",
        "storage_url": "data/sample_assets/course_neural_networks/transcript.json",
    }

    first = client.post("/api/assets", json=payload, headers=auth_headers)
    second = client.post("/api/assets", json=payload, headers=auth_headers)

    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["duplicate"] is False
    assert second.json()["duplicate"] is True
    assert second.json()["asset_id"] == first.json()["asset_id"]
