"use client";

import { useEffect, useState } from "react";
import { getMetrics } from "@/lib/api";
import FrictionThemeChart from "@/dashboards/FrictionThemeChart";

type Metrics = {
  pipeline_health?: Record<string, number>;
  review_outcomes?: Record<string, number>;
  total_assets?: number;
  total_segments_indexed?: number;
};

const toThemes = (counts: Record<string, number> | undefined) =>
  Object.entries(counts ?? {})
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }));

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMetrics()
      .then((m) => setMetrics(m as Metrics))
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
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded p-3">
              <div className="text-xs text-gray-500">Total assets</div>
              <div className="text-2xl font-semibold">{metrics.total_assets ?? 0}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs text-gray-500">Segments indexed</div>
              <div className="text-2xl font-semibold">{metrics.total_segments_indexed ?? 0}</div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">Pipeline health, by stage</h2>
            <FrictionThemeChart themes={toThemes(metrics.pipeline_health)} />
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">Review outcomes</h2>
            <FrictionThemeChart themes={toThemes(metrics.review_outcomes)} />
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500">Raw metrics response</summary>
            <pre className="bg-gray-50 border rounded p-3 overflow-auto mt-2">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
