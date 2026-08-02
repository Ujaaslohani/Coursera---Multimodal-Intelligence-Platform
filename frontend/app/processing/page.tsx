"use client";

import { useState } from "react";
import { getProcessingJob, startProcessingJob, archiveProcessingJob } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { StageProgress } from "@/components/ui/StageProgress";

type Job = { job_id: string; asset_id: string; stage: string; error: string | null };

export default function ProcessingPage() {
  const [jobId, setJobId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "start" | "archive" | null>(null);

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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

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
                </p>
                <div className="mt-3">
                  <StageProgress stage={job.stage} />
                </div>
              </div>
              {job.stage !== "failed" && job.stage !== "archived" && (
                <Button variant="outline" size="sm" onClick={handleArchive} disabled={busy === "archive"}>
                  {busy === "archive" ? "Archiving…" : "Archive"}
                </Button>
              )}
            </div>
            {job.error && (
              <div className="mt-4">
                <Alert tone="danger">{job.error}</Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
