"use client";

import { useState } from "react";
import { getProcessingJob } from "@/lib/api";

export default function ProcessingPage() {
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<{ job_id: string; asset_id: string; stage: string; error: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setJob(await getProcessingJob(jobId));
    } catch (err) {
      setError((err as Error).message);
      setJob(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Processing Monitor</h1>
      <form onSubmit={handleCheck} className="flex gap-2 max-w-md">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder="job id"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
        />
        <button type="submit" className="bg-blue-800 text-white px-4 py-1 rounded">
          Check status
        </button>
      </form>
      {job && (
        <div className="mt-4 border rounded p-3 text-sm">
          <p>Job: {job.job_id}</p>
          <p>Asset: {job.asset_id}</p>
          <p>Stage: {job.stage}</p>
          {job.error && <p className="text-red-700">Error: {job.error}</p>}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}
