"""Real visual embeddings, per doc §5.4 'Embedding and Multimodal Indexing'
and §6.2 tech choices ('CLIP-style image embeddings'). Unlike
ai/embeddings/embed.py (which embeds OCR'd/extracted TEXT — a deliberate v1
simplification the codebase itself flagged), this module embeds the actual
pixels of an image and the actual query text into the SAME shared vector
space, using OpenAI CLIP ViT-B/32 (via sentence-transformers, runs locally,
no API key needed). That means an image with no readable text — a diagram,
a photo, a chart with no OCR-able labels — is still searchable by what it
visually depicts, not just by words on it.
"""
from pathlib import Path

CLIP_MODEL_NAME = "clip-ViT-B-32"
CLIP_EMBEDDING_DIM = 512  # matches app.database.models.Segment.image_embedding

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(CLIP_MODEL_NAME)
    return _model


def embed_image(image_path: str) -> list[float]:
    from PIL import Image

    model = _get_model()
    image = Image.open(Path(image_path)).convert("RGB")
    vector = model.encode(image, convert_to_numpy=True, normalize_embeddings=True)
    return vector.tolist()


def embed_text_clip(text: str) -> list[float]:
    """Embeds a query with CLIP's own text encoder — NOT the same space as
    ai/embeddings/embed.py's OpenAI text embeddings — so it can be compared
    against embed_image()'s output for a genuine visual similarity search.
    """
    model = _get_model()
    vector = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    return vector.tolist()
