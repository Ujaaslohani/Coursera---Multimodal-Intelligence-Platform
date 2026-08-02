"use client";

import { useEffect, useState } from "react";
import { getMetrics } from "@/lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Learning Analytics Dashboard</h1>
      <p className="text-sm text-gray-600 mb-4">
        Friction themes, confusion clusters, engagement signals, and quality scores. Backed by{" "}
        <code>GET /api/metrics</code>.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {metrics && (
        <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto">
          {JSON.stringify(metrics, null, 2)}
        </pre>
      )}
    </div>
  );
}
