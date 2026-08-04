"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createAsset, checkStorage } from "@/lib/api";
import { MODALITIES, modalityMeta } from "@/lib/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { CopyableId } from "@/components/ui/CopyableId";

const OWNER_STORAGE_KEY = "mip:last-owner";

type Registration = { assetId: string; jobId: string; duplicate: boolean; modality: string; storageUrl: string };

export default function AssetsPage() {
  const [modality, setModality] = useState<string>(MODALITIES[0]);
  const [owner, setOwner] = useState("");
  const [topic, setTopic] = useState("");
  const [storageUrl, setStorageUrl] = useState("");
  const [result, setResult] = useState<{ assetId: string; jobId: string; duplicate: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<Registration[]>([]);

  const [pathCheck, setPathCheck] = useState<"idle" | "checking" | "exists" | "missing" | "error">("idle");

  useEffect(() => {
    const saved = window.localStorage.getItem(OWNER_STORAGE_KEY);
    if (saved) setOwner(saved);
  }, []);

  async function handleStorageUrlBlur() {
    if (!storageUrl.trim()) {
      setPathCheck("idle");
      return;
    }
    setPathCheck("checking");
    try {
      const res = await checkStorage(storageUrl.trim());
      setPathCheck(res.exists ? "exists" : "missing");
    } catch {
      setPathCheck("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await createAsset({ modality, owner, topic, storage_url: storageUrl });
      setResult({ assetId: res.asset_id, jobId: res.job_id, duplicate: res.duplicate });
      setRecent((prev) => [
        { assetId: res.asset_id, jobId: res.job_id, duplicate: res.duplicate, modality, storageUrl },
        ...prev,
      ].slice(0, 6));
      window.localStorage.setItem(OWNER_STORAGE_KEY, owner);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Stage 1 of 9 · Intake"
        title="Asset Intake Console"
        description="Register a video, image, slide, transcript, quiz, or discussion asset. Re-registering the same owner + modality + storage URL is detected as a duplicate, not re-processed."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="modality">Modality</Label>
                <Select id="modality" value={modality} onChange={(e) => setModality(e.target.value)}>
                  {MODALITIES.map((m) => (
                    <option key={m} value={m}>
                      {modalityMeta(m).icon} {modalityMeta(m).label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="content-team@coursera.org"
                  required
                />
              </div>
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Backpropagation" />
              </div>
              <div>
                <Label htmlFor="storage_url">Storage URL</Label>
                <Input
                  id="storage_url"
                  value={storageUrl}
                  onChange={(e) => {
                    setStorageUrl(e.target.value);
                    setPathCheck("idle");
                  }}
                  onBlur={handleStorageUrlBlur}
                  placeholder="data/sample_assets/course_neural_networks/transcript.json"
                  required
                />
                <p className="mt-1.5 text-xs">
                  {pathCheck === "checking" && <span className="text-ink-400">Checking path…</span>}
                  {pathCheck === "exists" && <span className="text-success-600">✓ file found</span>}
                  {pathCheck === "missing" && <span className="text-danger-600">✗ no file at this path — the processing job will fail</span>}
                  {pathCheck === "error" && <span className="text-ink-400">Couldn't check the path — try registering anyway</span>}
                </p>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Registering…" : "Register asset"}
              </Button>

              {result && (
                <Alert tone={result.duplicate ? "info" : "success"}>
                  <div className="space-y-2.5">
                    <p>{result.duplicate ? "Already registered — reusing existing asset." : "Registered — a processing job was created."}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-ink-400">Asset ID</span>
                      <CopyableId value={result.assetId} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-ink-400">Job ID</span>
                      <CopyableId value={result.jobId} />
                    </div>
                    <Link href={`/processing?asset_id=${result.assetId}`}>
                      <Button type="button" size="sm" variant="outline">
                        Process this asset →
                      </Button>
                    </Link>
                  </div>
                </Alert>
              )}
              {error && <Alert tone="danger">{error}</Alert>}
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardContent>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">What happens next</h3>
              <ol className="space-y-3 text-sm text-ink-600">
                <li className="flex gap-2.5">
                  <Badge tone="brand">1</Badge>
                  <span>A processing job is created at <span className="font-mono text-xs">uploaded</span>.</span>
                </li>
                <li className="flex gap-2.5">
                  <Badge tone="brand">2</Badge>
                  <span>Start it from the Processing Monitor to preprocess, embed, and index it.</span>
                </li>
                <li className="flex gap-2.5">
                  <Badge tone="brand">3</Badge>
                  <span>Once <span className="font-mono text-xs">searchable</span>, it's part of every future cross-modal query.</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Registered this session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recent.map((r) => {
                  const meta = modalityMeta(r.modality);
                  return (
                    <div key={r.assetId} className="rounded-lg border border-ink-100 bg-ink-50/60 p-2.5 text-xs">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium text-ink-700">
                          {meta.icon} {meta.label}
                        </span>
                        {r.duplicate && <Badge tone="info">duplicate</Badge>}
                      </div>
                      <p className="mb-1.5 truncate text-ink-400" title={r.storageUrl}>{r.storageUrl}</p>
                      <div className="flex items-center justify-between gap-2">
                        <CopyableId value={r.assetId} className="text-[11px]" />
                        <Link href={`/processing?asset_id=${r.assetId}`} className="text-brand-600 hover:underline">
                          Process →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
