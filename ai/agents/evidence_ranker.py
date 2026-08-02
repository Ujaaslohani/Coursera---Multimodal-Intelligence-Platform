"""Evidence Ranker agent, per doc §7.5. Re-ranks retrieval's raw
similarity-sorted results so the evidence handed to synthesis is not just
"most similar" but genuinely representative: it rewards modality diversity
(so a video-only result set doesn't crowd out a relevant discussion post)
and penalizes near-duplicate text across segments (e.g. the same sample
sentence embedded twice under two different asset registrations).
"""
from difflib import SequenceMatcher


def _is_near_duplicate(a: str, b: str, threshold: float = 0.92) -> bool:
    if not a or not b:
        return False
    return SequenceMatcher(None, a, b).ratio() >= threshold


def rank(evidence: list, modality_key: str = "modality", text_key: str = "text_content",
         similarity_key: str = "similarity") -> list:
    """`evidence` is a list of dict-likes (RetrievedEvidence as dicts) sorted
    however retrieval returned them. Returns a re-ordered list: still
    similarity-led, but demoting near-duplicate text and giving each
    modality's best match a placement bump so the final set stays
    genuinely cross-modal rather than dominated by one asset's many segments.
    """
    remaining = list(evidence)
    ranked: list = []
    seen_modalities: set[str] = set()
    seen_texts: list[str] = []

    def get(item, key):
        return item[key] if isinstance(item, dict) else getattr(item, key)

    # Pass 1: best segment per not-yet-seen modality, in similarity order.
    remaining.sort(key=lambda e: get(e, similarity_key), reverse=True)
    still_pending = []
    for item in remaining:
        text = get(item, text_key) or ""
        if any(_is_near_duplicate(text, seen) for seen in seen_texts):
            continue
        modality = get(item, modality_key)
        if modality not in seen_modalities:
            ranked.append(item)
            seen_modalities.add(modality)
            seen_texts.append(text)
        else:
            still_pending.append(item)

    # Pass 2: fill remaining slots by similarity, still skipping duplicates.
    for item in still_pending:
        text = get(item, text_key) or ""
        if any(_is_near_duplicate(text, seen) for seen in seen_texts):
            continue
        ranked.append(item)
        seen_texts.append(text)

    return ranked
