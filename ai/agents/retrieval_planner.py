"""Retrieval Planner agent, per doc §7.5: 'Agent roles can include an asset
profiler, retrieval planner, evidence ranker, synthesis writer, recommendation
reviewer, and quality validator.' This is the first step of the agent
pipeline — it decides HOW to search before any search runs, rather than
retrieval always running with fixed, hardcoded parameters.
"""
import json
import os

from openai import OpenAI

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


PLANNER_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """You are a retrieval planner for a learning-analytics search system. Given an
educator's question, decide the best search strategy: how many evidence
segments are worth retrieving, and the core concept phrase to search for
(which may be a cleaned-up or expanded version of the question — e.g.
resolving pronouns, dropping filler words). Do not answer the question."""

OUTPUT_SCHEMA_INSTRUCTIONS = """Respond with a JSON object with exactly these fields:
{
  "search_terms": "<the concept phrase to search for>",
  "top_k": <integer, 3-15 — more for broad/vague questions, fewer for narrow ones>,
  "reasoning": "<one short sentence explaining the choice>"
}"""


def plan(question: str, default_top_k: int = 10) -> dict:
    try:
        response = get_client().chat.completions.create(
            model=PLANNER_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Question: {question}\n\n{OUTPUT_SCHEMA_INSTRUCTIONS}"},
            ],
        )
        result = json.loads(response.choices[0].message.content)
        result.setdefault("search_terms", question)
        result["top_k"] = max(3, min(15, int(result.get("top_k") or default_top_k)))
        return result
    except Exception as e:  # planner is an optimization, not a hard dependency — fail open
        return {"search_terms": question, "top_k": default_top_k, "reasoning": f"planner unavailable ({e}); using defaults"}
