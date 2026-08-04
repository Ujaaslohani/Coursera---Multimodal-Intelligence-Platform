"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProcessingJob, startProcessingJob, archiveProcessingJob, listAssets, AssetStatusItem } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { StageProgress } from "@/components/ui/StageProgress";
import { modalityMeta, stageIndex, STAGE_LABELS, JOB_STAGE_ORDER } from "@/lib/domain";

type Job = { job_id: string; asset_id: string; stage: string; error: string | null };
type Filter = "all" | "processed" | "unprocessed";

const SEARCHABLE_INDEX = JOB_STAGE_ORDER.indexOf("searchable");
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 24; // ~2 minutes, then stop rather than poll forever in the background

function isProcessed(stage: string | null): boolean {
  return stage !== null && stage !== "failed" && stageIndex(stage) >= SEARCHABLE_INDEX;
}

function stageTone(stage: string | null): "neutral" | "success" | "warning" | "danger" {
  if (stage === "failed") return "danger";
  if (stage === null) return "neutral";
  return isProcessed(stage) ? "success" : "warning";
}

function ProcessingPageInner() {
  const searchParams = useSearchParams();

  const [jobId, setJobId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "start" | "archive" | "retry" | null>(null);

  const [assets, setAssets] = useState<AssetStatusItem[] | null>(null);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  const loadAssets = useCallback(() => {
    listAssets()
      .then(setAssets)
      .catch((err) => setAssetsError((err as Error).message));
  }, []);

  useEffect(() => {
    const prefill = searchParams.get("asset_id");
    if (prefill) setAssetId(prefill);
    loadAssets();
  }, [searchParams, loadAssets]);

  // A job's stage can still change asynchronously after this page loaded it
  // (a later query/synthesis/review elsewhere in the app advances it) —
  // poll while it's not in a genuinely terminal stage, capped so this never
  // polls forever in the background.
  useEffect(() => {
    if (!job || job.stage === "archived" || job.stage === "failed") return;
    let cancelled = false;
    let polls = 0;
    const interval = setInterval(async () => {
      polls += 1;
      if (polls > MAX_POLLS) {
        clearInterval(interval);
        return;
      }
      try {
        const fresh = await getProcessingJob(job.job_id);
        if (!cancelled) setJob(fresh);
      } catch {
        // transient — next poll will retry
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.job_id, job?.stage]);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("check");
    try {
      setJob(await getProcessingJob(jobId));
    } catch (err) {
      setError((err as Error).message);
      setJob(null);
    } finally {
      setBusy(null);
    }
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("start");
    try {
      const started = await startProcessingJob(assetId);
      setJob(started as Job);
      setJobId(started.job_id);
      loadAssets();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleArchive() {
    if (!job) return;
    setBusy("archive");
    setError(null);
    try {
      setJob(await archiveProcessingJob(job.job_id));
      loadAssets();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleRetry() {
    if (!job) return;
    setBusy("retry");
    setError(null);
    try {
      const retried = await startProcessingJob(job.asset_id);
      setJob(retried as Job);
      setJobId(retried.job_id);
      loadAssets();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleProcessAll() {
    const targets = (assets ?? []).filter((a) => !isProcessed(a.stage) && a.stage !== "failed");
    if (targets.length === 0) return;
    setBulk({ done: 0, total: targets.length });
    for (const a of targets) {
      try {
        await startProcessingJob(a.asset_id);
      } catch {
        // one asset failing shouldn't stop the rest of the batch
      }
      setBulk((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }
    loadAssets();
    setBulk(null);
  }

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    let list = assets;
    if (filter === "processed") list = list.filter((a) => isProcessed(a.stage));
    if (filter === "unprocessed") list = list.filter((a) => !isProcessed(a.stage));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => (a.topic ?? "").toLowerCase().includes(q) || a.owner.toLowerCase().includes(q));
    }
    return list;
  }, [assets, filter, search]);

  const counts = useMemo(() => {
    const list = assets ?? [];
    return {
      all: list.length,
      processed: list.filter((a) => isProcessed(a.stage)).length,
      unprocessed: list.filter((a) => !isProcessed(a.stage)).length,
    };
  }, [assets]);

  const unprocessedCount = counts.unprocessed;

  return (
    <div>
      <PageHeader
        eyebrow="Stages 2–5, and archival · Ingestion"
        title="Processing Monitor"
        description="Run an asset's job through preprocess → embed → index → searchable, or check where an existing job stands across all 9 lifecycle stages."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Start a processing job</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStart} className="space-y-3">
              <div>
                <Label htmlFor="asset_id">Asset ID</Label>
                <Input id="asset_id" value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="e.g. 8ff9f4ec-…" required />
              </div>
              <Button type="submit" disabled={busy === "start"}>
                {busy === "start" ? "Running…" : "Run processing job"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Check job status</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheck} className="flex gap-2">
              <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="job id" />
              <Button type="submit" variant="outline" disabled={busy === "check"}>
                {busy === "check" ? "Checking…" : "Check"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-6">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {job && (
        <Card className="mt-6">
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-ink-400">
                  Job <span className="font-mono">{job.job_id}</span> · Asset <span className="font-mono">{job.asset_id}</span>
                  {job.stage !== "archived" && job.stage !== "failed" && (
                    <span className="ml-2 text-brand-500">· auto-refreshing…</span>
                  )}
                </p>
                <div className="mt-3">
                  <StageProgress stage={job.stage} />
                </div>
              </div>
              <div className="flex gap-2">
                {job.stage === "failed" && (
                  <Button variant="outline" size="sm" onClick={handleRetry} disabled={busy === "retry"}>
                    {busy === "retry" ? "Retrying…" : "↻ Retry"}
                  </Button>
                )}
                {job.stage !== "failed" && job.stage !== "archived" && (
                  <Button variant="outline" size="sm" onClick={handleArchive} disabled={busy === "archive"}>
                    {busy === "archive" ? "Archiving…" : "Archive"}
                  </Button>
                )}
              </div>
            </div>
            {job.error && (
              <div className="mt-4">
                <Alert tone="danger">{job.error}</Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>All assets</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topic or owner…"
                className="w-48"
              />
              <div className="flex gap-1.5">
                {([
                  ["all", `All (${counts.all})`],
                  ["unprocessed", `Not processed (${counts.unprocessed})`],
                  ["processed", `Processed (${counts.processed})`],
                ] as [Filter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                      (filter === key ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {unprocessedCount > 0 && (
                <Button type="button" size="sm" onClick={handleProcessAll} disabled={bulk !== null}>
                  {bulk ? `Processing ${bulk.done}/${bulk.total}…` : `Process all unprocessed (${unprocessedCount})`}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assetsError && <Alert tone="danger">{assetsError}</Alert>}
          {!assetsError && filteredAssets.length === 0 && (
            <p className="text-sm text-ink-400">No assets in this filter yet.</p>
          )}
          {filteredAssets.length > 0 && (
            <div className="scrollbar-thin max-h-[480px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-ink-100 bg-white text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Modality</th>
                    <th className="py-2 pr-4 font-medium">Topic / Owner</th>
                    <th className="py-2 pr-4 font-medium">Stage</th>
                    <th className="py-2 pr-4 font-medium">Asset ID</th>
                    <th className="py-2 pr-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((a) => {
                    const meta = modalityMeta(a.modality);
                    return (
                      <tr key={a.asset_id} className="border-b border-ink-50 last:border-0">
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          {meta.icon} {meta.label}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="text-ink-800">{a.topic || "—"}</div>
                          <div className="text-xs text-ink-400">{a.owner}</div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={stageTone(a.stage)}>{a.stage ? STAGE_LABELS[a.stage] ?? a.stage : "no job"}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-ink-400">{a.asset_id.slice(0, 8)}…</td>
                        <td className="py-2.5 pr-4 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={isProcessed(a.stage) ? "outline" : "primary"}
                            onClick={() => setAssetId(a.asset_id)}
                          >
                            Use ID
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={null}>
      <ProcessingPageInner />
    </Suspense>
  );
}
