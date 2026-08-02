"""Evaluation harness, per doc §5.4 evaluation guidance: measure whether
retrieval finds the correct segment, whether the right modalities get linked,
whether synthesis is grounded, and whether recommendations are actionable.
Benchmark cases live in data/evaluation_cases.json.
"""
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass
class EvalResult:
    query: str
    expected_segment_ids: set[str]
    retrieved_segment_ids: set[str]
    recall_at_k: float
    grounded: bool  # every citation in the synthesized answer maps to a retrieved segment


def load_cases(path: str = "data/evaluation_cases.json") -> list[dict]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def score_retrieval(expected_segment_ids: list[str], retrieved_segment_ids: list[str]) -> float:
    expected = set(expected_segment_ids)
    if not expected:
        return 1.0
    retrieved = set(retrieved_segment_ids)
    return len(expected & retrieved) / len(expected)


def score_groundedness(citations: list[dict], retrieved_segment_ids: list[str]) -> bool:
    retrieved = set(retrieved_segment_ids)
    cited = {c["segment_id"] for c in citations}
    return cited.issubset(retrieved)


def run_evaluation(retrieve_fn, synthesize_fn, cases: list[dict]) -> list[EvalResult]:
    """retrieve_fn(question) -> list[RetrievedEvidence]
    synthesize_fn(question, evidence) -> dict with 'citations'
    """
    results = []
    for case in cases:
        evidence = retrieve_fn(case["question"])
        retrieved_ids = [e.segment_id for e in evidence]
        synthesis = synthesize_fn(case["question"], evidence)

        results.append(
            EvalResult(
                query=case["question"],
                expected_segment_ids=set(case.get("expected_segment_ids", [])),
                retrieved_segment_ids=set(retrieved_ids),
                recall_at_k=score_retrieval(case.get("expected_segment_ids", []), retrieved_ids),
                grounded=score_groundedness(synthesis.get("citations", []), retrieved_ids),
            )
        )
    return results
