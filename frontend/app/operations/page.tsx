"use client";

import { useEffect, useState } from "react";
import { getMetrics } from "@/lib/api";

export default function OperationsPage() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Operations & Governance Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="border rounded p-3">
          <p className="text-xs text-gray-500">Total jobs</p>
          <p className="text-xl font-bold">{String(metrics?.total_jobs ?? "-")}</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-xs text-gray-500">Failed jobs</p>
          <p className="text-xl font-bold">{String(metrics?.failed_jobs ?? "-")}</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-xs text-gray-500">Total insights</p>
          <p className="text-xl font-bold">{String(metrics?.total_insights ?? "-")}</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-xs text-gray-500">Pending review</p>
          <p className="text-xl font-bold">{String(metrics?.pending_review ?? "-")}</p>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}
