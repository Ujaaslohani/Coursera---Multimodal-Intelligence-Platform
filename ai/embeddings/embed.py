"""Embedding generation for normalized segments, per doc §5.4 'Embedding and
Multimodal Indexing'. Text-derived modalities (transcript, discussion, quiz,
OCR'd slide/image text) all route through one text embedding model, so
retrieval can run mixed-modality search from a single query without callers
needing to know which modality produced a given vector.
"""
import os

from openai import OpenAI

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


EMBEDDING_MODEL = "text-embedding-3-small"  # 1536 dims — matches backend/app/database/models.py Segment.embedding


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    response = get_client().embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


def embed_segment(text_content: str) -> list[float]:
    return embed_texts([text_content])[0]
