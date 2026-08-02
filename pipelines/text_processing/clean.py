"""Text/discussion preprocessing per doc §5.4: clean, deduplicate, segment,
and link content to relevant topics or concepts. Applies to transcripts
(pre-aligned by video_processing), quiz text, and discussion threads.
"""
import re


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def deduplicate(units: list[dict]) -> list[dict]:
    seen: set[str] = set()
    deduped = []
    for unit in units:
        key = normalize_whitespace(unit.get("text", "")).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(unit)
    return deduped


def process_discussion_thread(asset_id: str, posts: list[dict]) -> dict:
    """posts: [{"text": "...", "author": "...", "created_at": "..."}]"""
    units = [{"text": normalize_whitespace(p["text"]), "metadata": {"author": p.get("author")}} for p in posts if p.get("text")]
    return {
        "asset_id": asset_id,
        "modality": "discussion",
        "raw_units": deduplicate(units),
    }


def process_quiz(asset_id: str, questions: list[dict]) -> dict:
    """questions: [{"question": "...", "answer_pattern": "...", "difficulty": "..."}]"""
    units = [
        {
            "text": normalize_whitespace(f"{q['question']} {q.get('answer_pattern', '')}"),
            "metadata": {"difficulty": q.get("difficulty")},
        }
        for q in questions
        if q.get("question")
    ]
    return {
        "asset_id": asset_id,
        "modality": "quiz",
        "raw_units": deduplicate(units),
    }
