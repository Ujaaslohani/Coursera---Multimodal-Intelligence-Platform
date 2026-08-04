"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getInsight, submitReviewFeedback, listInsights, getSegment, InsightListItem, SegmentDetail } from "@/lib/api";
import { DECISION_META, modalityMeta, timeAgo } from "@/lib/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { CopyableId } from "@/components/ui/CopyableId";

type Insight = {
  insight_id: string;
  answer_text: string;
  citations: Record<string, unknown>[];
  status: string;
};

function RecommendationsPageInner() {
  const searchParams = useSearchParams();

  const [insightId, setInsightId] = useState("");
  const [insight, setInsight] = useState<Insight | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pending, setPending] = useState<InsightListItem[] | null>(null);
  const [segmentPreviews, setSegmentPreviews] = useState<Record<string, SegmentDetail>>({});

  const loadPending = useCallback(() => {
    listInsights("pending_review", 50)
      .then(setPending)
      .catch(() => setPending([]));
  }, []);

  const loadInsight = useCallback(async (id: string) => {
    setError(null);
    try {
      const loaded = await getInsight(id);
      setInsight(loaded);
      setInsightId(id);
      const segmentIds = loaded.citations
        .map((c) => (c as { segment_id?: string }).segment_id)
        .filter((id): id is string => Boolean(id));
      const previews = await Promise.all(
        segmentIds.map((id) =>
          getSegment(id)
            .then((s) => [id, s] as const)
            .catch(() => null)
        )
      );
      setSegmentPreviews(Object.fromEntries(previews.filter((p): p is [string, SegmentDetail] => p !== null)));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadPending();
    const prefill = searchParams.get("insight_id");
    if (prefill) loadInsight(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    await loadInsight(insightId);
  }

  async function handleDecision(decision: "accept" | "edit" | "reject" | "escalate") {
    if (!insight) return;
    setBusy(true);
    setError(null);
    try {
      await submitReviewFeedback({ insight_id: insight.insight_id, decision, notes });
      setInsight({ ...insight, status: decision });
      loadPending();
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
        description="No insight becomes an approved action on its own. Pick one from the queue below, or load one by ID — then accept, edit, reject, or escalate. Every decision is logged and advances the source evidence to its 'reviewed' lifecycle stage."
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

      {!insight && pending && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pending review ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 && <p className="text-sm text-ink-400">Nothing waiting for review.</p>}
            {pending.map((p) => (
              <button
                key={p.insight_id}
                type="button"
                onClick={() => loadInsight(p.insight_id)}
                className="block w-full rounded-lg border border-ink-100 bg-ink-50/60 p-3 text-left text-sm hover:bg-ink-100/70"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-400">
                  <span>{p.created_at ? timeAgo(p.created_at) : ""}</span>
                  {p.confidence != null && <span>{Math.round(p.confidence * 100)}% confidence</span>}
                </div>
                <p className="text-ink-700">{p.answer_preview}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {insight && (
        <Card className="mt-6">
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-400">Insight</span>
                <CopyableId value={insight.insight_id} />
              </div>
              {statusMeta && <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>}
            </div>
            <p className="text-sm leading-relaxed text-ink-800">{insight.answer_text}</p>

            {insight.citations.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Citations ({insight.citations.length})
                </p>
                <div className="space-y-2">
                  {insight.citations.map((c, i) => {
                    const segmentId = (c as { segment_id?: string }).segment_id ?? "";
                    const reason = (c as { reason?: string }).reason ?? "";
                    const preview = segmentPreviews[segmentId];
                    const meta = preview ? modalityMeta(preview.modality) : null;
                    return (
                      <div key={i} className="rounded-lg border border-ink-100 bg-ink-50/60 p-3 text-xs">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-mono text-ink-400">{segmentId.slice(0, 8)}…</span>
                          {meta && <Badge tone="neutral">{meta.icon} {meta.label}</Badge>}
                        </div>
                        {preview?.text_content && (
                          <p className="mb-1 text-ink-700">&ldquo;{preview.text_content}&rdquo;</p>
                        )}
                        {reason && <p className="italic text-ink-400">{reason}</p>}
                        {preview && (
                          <Link href={`/processing?asset_id=${preview.asset_id}`} className="mt-1 inline-block text-brand-600 hover:underline">
                            View source asset →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInsight(null);
                  setInsightId("");
                }}
              >
                ← Back to queue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={null}>
      <RecommendationsPageInner />
    </Suspense>
  );
}
