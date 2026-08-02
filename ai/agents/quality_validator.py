"""Quality Validator agent, per doc §7.5. This is what makes groundedness
checking a live gate rather than only an offline eval metric
(ai/evaluation/evaluate.py::score_groundedness already existed but was only
ever called from tests/benchmarks, never from the request path itself).
Any citation that doesn't map to a segment that was actually retrieved is
stripped before the insight is ever shown to a reviewer, and confidence is
capped when that happens — the platform must not present an ungrounded
claim as if it were fully supported.
"""
from ai.evaluation.evaluate import score_groundedness


def validate(synthesis: dict, retrieved_segment_ids: list[str]) -> dict:
    citations = synthesis.get("citations", [])
    grounded = score_groundedness(citations, retrieved_segment_ids)

    if grounded or not citations:
        return {**synthesis, "grounded": True}

    retrieved = set(retrieved_segment_ids)
    kept = [c for c in citations if c.get("segment_id") in retrieved]
    dropped = len(citations) - len(kept)

    result = dict(synthesis)
    result["citations"] = kept
    result["grounded"] = False
    result["confidence"] = min(float(synthesis.get("confidence") or 0.0), 0.3)
    note = f" [Quality validator: {dropped} unsupported citation(s) removed before review.]"
    result["answer"] = (synthesis.get("answer") or "") + note
    return result
