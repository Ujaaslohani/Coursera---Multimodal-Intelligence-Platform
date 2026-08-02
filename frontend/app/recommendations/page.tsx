"use client";

import { useState } from "react";
import { getInsight, submitReviewFeedback } from "@/lib/api";

export default function RecommendationsPage() {
  const [insightId, setInsightId] = useState("");
  const [insight, setInsight] = useState<{
    insight_id: string;
    answer_text: string;
    citations: Record<string, unknown>[];
    status: string;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setInsight(await getInsight(insightId));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDecision(decision: "accept" | "edit" | "reject" | "escalate") {
    if (!insight) return;
    try {
      await submitReviewFeedback({ insight_id: insight.insight_id, decision, notes });
      setInsight({ ...insight, status: decision });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Recommendation Review Workspace</h1>
      <form onSubmit={handleLoad} className="flex gap-2 max-w-md mb-4">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder="insight id"
          value={insightId}
          onChange={(e) => setInsightId(e.target.value)}
        />
        <button type="submit" className="bg-blue-800 text-white px-4 py-1 rounded">
          Load
        </button>
      </form>

      {insight && (
        <div className="border rounded p-4 max-w-xl">
          <p className="text-sm mb-2">{insight.answer_text}</p>
          <p className="text-xs text-gray-500 mb-3">Status: {insight.status}</p>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm mb-3"
            placeholder="reviewer notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => handleDecision("accept")} className="bg-green-700 text-white px-3 py-1 rounded text-sm">
              Accept
            </button>
            <button onClick={() => handleDecision("edit")} className="bg-yellow-600 text-white px-3 py-1 rounded text-sm">
              Edit
            </button>
            <button onClick={() => handleDecision("reject")} className="bg-red-700 text-white px-3 py-1 rounded text-sm">
              Reject
            </button>
            <button onClick={() => handleDecision("escalate")} className="bg-gray-700 text-white px-3 py-1 rounded text-sm">
              Escalate
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}
