"use client";

import { useCallback, useEffect, useState } from "react";
import { getMetrics } from "@/lib/api";
import FrictionThemeChart from "@/dashboards/FrictionThemeChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { RefreshBar } from "@/components/ui/RefreshBar";

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    getMetrics()
      .then((m) => {
        setMetrics(m as Metrics);
        setLastUpdated(new Date());
        setError(null);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow="Stage 9 · Governance"
        title="Learning Analytics Dashboard"
        description="Friction themes, pipeline health across the full 9-stage lifecycle, and review outcomes — sourced live from GET /api/metrics."
        actions={<RefreshBar lastUpdated={lastUpdated} onRefresh={load} refreshing={refreshing} />}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total assets" value={metrics.total_assets ?? 0} />
            <StatTile label="Segments indexed" value={metrics.total_segments_indexed ?? 0} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline health, by stage</CardTitle>
              </CardHeader>
              <CardContent>
                <FrictionThemeChart themes={toThemes(metrics.pipeline_health)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <FrictionThemeChart themes={toThemes(metrics.review_outcomes)} />
              </CardContent>
            </Card>
          </div>

          <details className="rounded-xl2 border border-ink-100 bg-white p-4 text-xs shadow-card">
            <summary className="cursor-pointer font-medium text-ink-500">Raw metrics response</summary>
            <pre className="mt-3 overflow-auto rounded-lg bg-ink-50 p-3 text-ink-600">{JSON.stringify(metrics, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
