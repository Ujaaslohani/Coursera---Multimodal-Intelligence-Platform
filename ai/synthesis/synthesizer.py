"""LLM synthesis layer, per doc §5.4 'LLM Synthesis and Recommendation
Generation' and §7.5 prompting approach. Consumes only retrieved, permitted
evidence; outputs must include citations, confidence, and a review-ready
recommendation — never an unconditionally-approved action.
"""
import json
import os

from openai import OpenAI

from ai.prompts.synthesis_prompt import SYSTEM_PROMPT, build_user_prompt
from ai.retrieval.retriever import RetrievedEvidence

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


SYNTHESIS_MODEL = "gpt-4o-mini"


def synthesize(question: str, evidence: list[RetrievedEvidence]) -> dict:
    if not evidence:
        return {
            "answer": "No permitted evidence was retrieved for this question, so no grounded insight can be generated.",
            "citations": [],
            "confidence": 0.0,
            "recommended_action": None,
        }

    evidence_payload = [
        {
            "segment_id": e.segment_id,
            "modality": e.modality,
            "timestamp_start": e.timestamp_start,
            "text_content": e.text_content,
        }
        for e in evidence
    ]

    response = get_client().chat.completions.create(
        model=SYNTHESIS_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(question, evidence_payload)},
        ],
    )

    return json.loads(response.choices[0].message.content)
