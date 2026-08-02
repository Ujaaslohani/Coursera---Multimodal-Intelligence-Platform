"use client";

import { useState } from "react";
import { runQuery, synthesize } from "@/lib/api";
import EvidencePanel from "@/components/EvidencePanel";

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [evidence, setEvidence] = useState<Record<string, unknown>[]>([]);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [insight, setInsight] = useState<{ answer_text: string; confidence: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInsight(null);
    setLoading(true);
    try {
      const res = await runQuery(question);
      setQueryId(res.query_id);
      setEvidence(res.retrieved_evidence);

      const synth = await synthesize(res.query_id, res.retrieved_evidence);
      setInsight({ answer_text: synth.answer_text, confidence: synth.confidence });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Unified Query Workspace</h1>
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder="Why are learners struggling with...?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" className="bg-blue-800 text-white px-4 py-1 rounded" disabled={loading}>
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>

      {insight && (
        <div className="mt-4 border rounded p-3 bg-blue-50">
          <p className="text-sm">{insight.answer_text}</p>
          {insight.confidence != null && (
            <p className="text-xs text-gray-500 mt-1">Confidence: {insight.confidence}</p>
          )}
        </div>
      )}

      {queryId && (
        <div className="mt-4">
          <h2 className="font-semibold text-sm mb-2">Evidence</h2>
          <EvidencePanel evidence={evidence} />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}
