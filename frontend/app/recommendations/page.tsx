"use client";

import { useState } from "react";
import { getInsight, submitReviewFeedback } from "@/lib/api";
import { DECISION_META } from "@/lib/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

type Insight = {
  insight_id: string;
  answer_text: string;
  citations: Record<string, unknown>[];
  status: string;
};

export default function RecommendationsPage() {
  const [insightId, setInsightId] = useState("");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    setError(null);
    try {
      await submitReviewFeedback({ insight_id: insight.insight_id, decision, notes });
      setInsight({ ...insight, status: decision });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const statusMeta = insight ? DECISION_META[insight.status] : null;

  return (
    <div>
      <PageHeader
        eyebrow="Stages 7–8 · Governance"
        title="Recommendation Review Workspace"
        description="No insight becomes an approved action on its own. Load one by ID, then accept, edit, reject, or escalate — every decision is logged and advances the source evidence to its 'reviewed' lifecycle stage."
      />

      <Card>
        <CardContent>
          <form onSubmit={handleLoad} className="flex gap-2">
            <Input value={insightId} onChange={(e) => setInsightId(e.target.value)} placeholder="insight id" className="flex-1" />
            <Button type="submit" variant="outline">
              Load
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {insight && (
        <Card className="mt-6">
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs text-ink-400">{insight.insight_id}</span>
              {statusMeta && <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>}
            </div>
            <p className="text-sm leading-relaxed text-ink-800">{insight.answer_text}</p>

            {insight.citations.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Citations ({insight.citations.length})
                </p>
                <ul className="space-y-1 text-xs text-ink-500">
                  {insight.citations.map((c, i) => (
                    <li key={i} className="font-mono">
                      {String((c as { segment_id?: string }).segment_id ?? "")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5">
              <Label htmlFor="notes">Reviewer notes</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this decision?" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="success" size="sm" onClick={() => handleDecision("accept")} disabled={busy}>
                ✓ Accept
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDecision("edit")} disabled={busy}>
                ✎ Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDecision("reject")} disabled={busy}>
                ✕ Reject
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDecision("escalate")} disabled={busy}>
                ⬆ Escalate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
