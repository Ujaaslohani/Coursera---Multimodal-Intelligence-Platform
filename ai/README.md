# ai

AI workflow layer: preprocessing normalization, embeddings, retrieval,
synthesis, prompts, and evaluation, per doc §7.1/§7.4/§7.5.

```
preprocessing/  # normalize raw pipeline output into the segment schema
embeddings/     # text embedding generation (OpenAI text-embedding-3-small)
retrieval/      # permission-aware pgvector similarity search + ranking
synthesis/      # LLM synthesis — grounded answer + citations + confidence
prompts/        # prompt templates (role, task, evidence, output schema)
evaluation/     # benchmark harness — retrieval recall + groundedness scoring
```

Called in-process by `backend/app/services/*` (see `retrieval_service.py`,
`embedding_service.py`, `synthesis_service.py`). Not a standalone deployable
service — imported as a library.

Requires `OPENAI_API_KEY` in the environment.
