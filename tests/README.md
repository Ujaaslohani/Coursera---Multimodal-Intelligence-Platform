# tests

Per doc §7.1/§7.7.

```
functional_tests/  # asset registration, job status, auth enforcement
retrieval_tests/   # cross-modal ranking, permission-aware filtering, top_k
ai_output_tests/   # groundedness + retrieval-recall scoring (pure unit tests, no DB/API needed)
edge_cases/        # empty evidence, missing text, 404s, duplicate-asset detection
```

Most tests need a live Postgres instance with the `pgvector` extension
(the `Vector` column type has no sqlite/in-memory equivalent). Set
`TEST_DATABASE_URL` to a disposable test database to run them:

```bash
pip install -r tests/requirements.txt -r backend/requirements.txt -r ai/requirements.txt

# macOS/Linux
export TEST_DATABASE_URL=postgresql://user:password@localhost:5432/coursera_mip_test
PYTHONPATH=.:./backend pytest tests/ -v

# Windows (Git Bash)
export TEST_DATABASE_URL=postgresql://user:password@localhost:5432/coursera_mip_test
PYTHONPATH=".;./backend" pytest tests/ -v
```

Tests that don't require a database (or that need one but it isn't
configured) skip automatically via the `requires_db` fixture in `conftest.py`.
`ai_output_tests/` never needs `requires_db` — those are pure function tests.
