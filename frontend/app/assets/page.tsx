"use client";

import { useState } from "react";
import { createAsset } from "@/lib/api";

const MODALITIES = ["video", "image", "slide", "transcript", "quiz", "discussion"];

export default function AssetsPage() {
  const [modality, setModality] = useState(MODALITIES[0]);
  const [owner, setOwner] = useState("");
  const [topic, setTopic] = useState("");
  const [storageUrl, setStorageUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const res = await createAsset({ modality, owner, topic, storage_url: storageUrl });
      setResult(`Registered asset ${res.asset_id} — processing job ${res.job_id} (${res.status})`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Asset Intake Console</h1>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <label className="block text-sm">
          Modality
          <select
            className="mt-1 w-full border rounded px-2 py-1"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Owner
          <input className="mt-1 w-full border rounded px-2 py-1" value={owner} onChange={(e) => setOwner(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Topic
          <input className="mt-1 w-full border rounded px-2 py-1" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className="block text-sm">
          Storage URL
          <input
            className="mt-1 w-full border rounded px-2 py-1"
            value={storageUrl}
            onChange={(e) => setStorageUrl(e.target.value)}
            placeholder="https://storage.example.com/..."
            required
          />
        </label>
        <button type="submit" className="bg-blue-800 text-white px-4 py-2 rounded">
          Register asset
        </button>
      </form>
      {result && <p className="mt-4 text-sm text-green-700">{result}</p>}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}
