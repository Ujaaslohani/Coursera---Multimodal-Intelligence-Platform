"""Functional test: asset registration -> processing job -> status check,
per doc §7.7 'Functional tests should verify asset registration, preprocessing
jobs, embedding generation, query execution, retrieval, synthesis, review
feedback, and dashboard metrics.'
"""


def test_register_asset_creates_job(requires_db, auth_headers):
    import uuid

    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # A unique owner/storage_url pair each run, since duplicate-asset detection
    # (asset_service.find_duplicate) is keyed on owner+modality+storage_url —
    # against a real, persistent test database (not a disposable one, see
    # conftest.py), a fixed value here would only pass once.
    response = client.post(
        "/api/assets",
        json={
            "modality": "transcript",
            "owner": f"test-{uuid.uuid4()}@coursera.org",
            "topic": "Backpropagation",
            "storage_url": "data/sample_assets/course_neural_networks/transcript.json",
            "permission_scope": ["course:neural-networks-101"],
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["asset_id"]
    assert body["job_id"]
    assert body["status"] == "uploaded"

    job_response = client.get(f"/api/processing-jobs/{body['job_id']}", headers=auth_headers)
    assert job_response.status_code == 200
    assert job_response.json()["stage"] == "uploaded"


def test_missing_auth_header_rejected(requires_db):
    # app.main runs Base.metadata.create_all() at import time, so even this
    # auth-only check needs a reachable database.
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.get("/api/metrics")
    assert response.status_code == 401
