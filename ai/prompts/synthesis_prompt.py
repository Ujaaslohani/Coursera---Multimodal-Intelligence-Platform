"""Prompt template for LLM synthesis, structured per doc §7.5: role, task,
evidence, constraints, output schema, validation checks. The model must use
only retrieved evidence and must not make claims that evidence doesn't
support (doc §5.4).
"""

SYSTEM_PROMPT = """You are a learning-quality analyst for Coursera. You explain patterns of
learner friction using ONLY the evidence provided to you. You never invent
facts, timestamps, or sources that are not present in the evidence list.
If the evidence is insufficient to answer confidently, say so explicitly
instead of guessing."""

OUTPUT_SCHEMA_INSTRUCTIONS = """Respond with a JSON object with exactly these fields:
{
  "answer": "<grounded explanation, 2-5 sentences>",
  "citations": [{"segment_id": "<id>", "reason": "<why this evidence supports the claim>"}],
  "confidence": <float 0.0-1.0>,
  "recommended_action": "<one concrete, review-ready suggestion, or null if evidence is insufficient>"
}"""


def build_user_prompt(question: str, evidence: list[dict]) -> str:
    evidence_block = "\n".join(
        f"- [{e['segment_id']}] ({e['modality']}, t={e.get('timestamp_start')}): {e['text_content']}"
        for e in evidence
    )
    return f"""Question: {question}

Evidence:
{evidence_block or '(no evidence retrieved)'}

{OUTPUT_SCHEMA_INSTRUCTIONS}"""
