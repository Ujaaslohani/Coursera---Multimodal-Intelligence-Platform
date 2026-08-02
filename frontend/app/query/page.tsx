"use client";

import { useState } from "react";
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

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [plan, setPlan] = useState<{ search_terms: string; top_k: number; reasoning: string } | null>(null);
  const [insight, setInsight] = useState<{ answer_text: string; confidence: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "planning" | "synthesizing">("idle");

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInsight(null);
    setPlan(null);
    setStage("planning");
    try {
      const res = await runQuery(question);
      setPlan(res.agent_plan);
      setEvidence(res.retrieved_evidence);

      setStage("synthesizing");
      const synth = await synthesize(res.query_id, res.retrieved_evidence);
      setInsight({ answer_text: synth.answer_text, confidence: synth.confidence });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStage("idle");
    }
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

      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
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
            <p className="text-sm leading-relaxed text-ink-800">{insight.answer_text}</p>
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
