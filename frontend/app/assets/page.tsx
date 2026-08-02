"use client";

import { useState } from "react";
import { createAsset } from "@/lib/api";
import { MODALITIES, modalityMeta } from "@/lib/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Label, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

export default function AssetsPage() {
  const [modality, setModality] = useState<string>(MODALITIES[0]);
  const [owner, setOwner] = useState("");
  const [topic, setTopic] = useState("");
  const [storageUrl, setStorageUrl] = useState("");
  const [result, setResult] = useState<{ assetId: string; jobId: string; duplicate: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await createAsset({ modality, owner, topic, storage_url: storageUrl });
      setResult({ assetId: res.asset_id, jobId: res.job_id, duplicate: res.duplicate });
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
                  onChange={(e) => setStorageUrl(e.target.value)}
                  placeholder="data/sample_assets/course_neural_networks/transcript.json"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Registering…" : "Register asset"}
              </Button>

              {result && (
                <Alert tone={result.duplicate ? "info" : "success"}>
                  {result.duplicate ? (
                    <>Already registered — reusing existing asset <span className="font-mono text-xs">{result.assetId}</span>.</>
                  ) : (
                    <>Registered asset <span className="font-mono text-xs">{result.assetId}</span> — processing job <span className="font-mono text-xs">{result.jobId}</span> created.</>
                  )}
                </Alert>
              )}
              {error && <Alert tone="danger">{error}</Alert>}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
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
      </div>
    </div>
  );
}
