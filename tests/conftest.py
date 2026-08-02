import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for path in (ROOT, ROOT / "backend"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

# Functional/retrieval tests need a real Postgres+pgvector instance (the
# Vector column type has no in-memory/sqlite equivalent). Point
# TEST_DATABASE_URL at a disposable test database to run them; otherwise
# they're skipped via the `requires_db` fixture below.
if os.environ.get("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

import time

import pytest


@pytest.fixture
def auth_headers():
    """A real signed HS256 JWT, not a placeholder string — app.auth.dependencies
    verifies the signature against JWT_SECRET, so an arbitrary bearer value
    (e.g. the literal "dev-token") is correctly rejected with 401 rather than
    accepted. See backend/scripts/mint_dev_token.py for the equivalent CLI.
    """
    import jwt

    secret = os.environ.get("JWT_SECRET")
    if not secret:
        pytest.skip("JWT_SECRET not set — cannot mint a test token")

    now = int(time.time())
    token = jwt.encode(
        {"sub": "test-user", "roles": ["educator"], "permitted_sources": ["*"], "iat": now, "exp": now + 3600},
        secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def requires_db():
    if not os.environ.get("TEST_DATABASE_URL"):
        pytest.skip("TEST_DATABASE_URL not set — skipping test that needs a live Postgres+pgvector instance")
