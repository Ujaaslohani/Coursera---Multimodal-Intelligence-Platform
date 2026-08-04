"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runQuery, synthesize, EvidenceItem } from "@/lib/api";
import EvidencePanel from "@/components/EvidencePanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

const EXAMPLE_QUESTIONS = [
  "Why are learners struggling with the backpropagation concept?",
  "What do learners say is missing from the lesson?",
  "What does the slide diagram say about the chain rule?",
];

const HISTORY_KEY = "mip:query-history";
const MAX_HISTORY = 8;

type Insight = { insightId: string; answerText: string; confidence: number | null };
type Plan = { search_terms: string; top_k: number; reasoning: string };
type HistoryEntry = { question: string; plan: Plan; evidence: EvidenceItem[]; insight: Insight; askedAt: string };

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "planning" | "synthesizing">("idle");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInsight(null);
    setPlan(null);
    setViewingHistory(false);
    setStage("planning");
    try {
      const res = await runQuery(question);
      setPlan(res.agent_plan);
      setEvidence(res.retrieved_evidence);

      setStage("synthesizing");
      const synth = await synthesize(res.query_id, res.retrieved_evidence);
      const insightResult = { insightId: synth.insight_id, answerText: synth.answer_text, confidence: synth.confidence };
      setInsight(insightResult);

      const entry: HistoryEntry = {
        question,
        plan: res.agent_plan,
        evidence: res.retrieved_evidence,
        insight: insightResult,
        askedAt: new Date().toISOString(),
      };
      const nextHistory = [entry, ...history].slice(0, MAX_HISTORY);
      setHistory(nextHistory);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStage("idle");
    }
  }

  function openHistoryEntry(entry: HistoryEntry) {
    setQuestion(entry.question);
    setPlan(entry.plan);
    setEvidence(entry.evidence);
    setInsight(entry.insight);
    setError(null);
    setViewingHistory(true);
  }

  const loading = stage !== "idle";

  return (
    <div>
      <PageHeader
        eyebrow="Stages 4–6 · Intelligence"
        title="Unified Query Workspace"
        description="Ask one plain-language question — a planner agent decides the search strategy, retrieval searches every modality at once (text meaning + real CLIP visual matching), and synthesis writes a grounded, cited answer."
      />

      <Card>
        <CardContent>
          <form onSubmit={handleAsk} className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="flex-1"
              placeholder="Why are learners struggling with...?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button type="submit" disabled={loading || !question}>
              {stage === "planning" ? "Planning search…" : stage === "synthesizing" ? "Synthesizing…" : "Ask"}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="rounded-full border border-ink-200 px-2.5 py-1 text-xs text-ink-500 hover:bg-ink-50"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="mt-4">
          <CardContent>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Recent questions</h3>
            <div className="flex flex-wrap gap-1.5">
              {history.map((entry, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openHistoryEntry(entry)}
                  className="max-w-xs truncate rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100"
                  title={entry.question}
                >
                  {entry.question}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {viewingHistory && (
        <div className="mt-4">
          <Alert tone="info">Showing a saved answer from history — not re-queried live.</Alert>
        </div>
      )}

      {plan && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🧭 Retrieval Planner agent</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-ink-600">
            <p>
              Searching for <span className="font-medium text-ink-900">&ldquo;{plan.search_terms}&rdquo;</span>, retrieving up
              to <Badge tone="brand">{plan.top_k}</Badge> segments.
            </p>
            <p className="mt-1.5 italic text-ink-400">{plan.reasoning}</p>
          </CardContent>
        </Card>
      )}

      {insight && (
        <Card className="mt-4 border-brand-200">
          <CardHeader>
            <CardTitle>✍️ Synthesis Writer agent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-ink-800">{insight.answerText}</p>
            {insight.confidence != null && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-400">Confidence</span>
                <div className="h-1.5 w-32 rounded-full bg-ink-100">
                  <div
                    className="h-1.5 rounded-full bg-brand-500"
                    style={{ width: `${Math.round(insight.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-ink-600">{Math.round(insight.confidence * 100)}%</span>
              </div>
            )}
            <div className="mt-4">
              <Link href={`/recommendations?insight_id=${insight.insightId}`}>
                <Button type="button" size="sm" variant="outline">
                  Send to review →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {evidence.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Evidence retrieved</h2>
          <EvidencePanel evidence={evidence} />
        </div>
      )}
    </div>
  );
}
