"""AI output tests, per doc §7.7: generated insights must be grounded in
retrieved evidence and include citations for material claims.
"""
from ai.evaluation.evaluate import score_groundedness, score_retrieval


def test_score_groundedness_passes_when_all_citations_are_retrieved():
    citations = [{"segment_id": "seg-1"}, {"segment_id": "seg-2"}]
    retrieved = ["seg-1", "seg-2", "seg-3"]
    assert score_groundedness(citations, retrieved) is True


def test_score_groundedness_fails_on_hallucinated_citation():
    citations = [{"segment_id": "seg-1"}, {"segment_id": "seg-not-retrieved"}]
    retrieved = ["seg-1", "seg-2"]
    assert score_groundedness(citations, retrieved) is False


def test_score_retrieval_recall():
    expected = ["seg-1", "seg-2", "seg-3"]
    retrieved = ["seg-1", "seg-2", "seg-9"]
    assert score_retrieval(expected, retrieved) == 2 / 3


def test_score_retrieval_perfect_recall_when_no_expected_ids():
    assert score_retrieval([], ["seg-1"]) == 1.0
