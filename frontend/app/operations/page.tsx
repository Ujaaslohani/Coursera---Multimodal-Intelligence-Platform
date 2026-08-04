"use client";

import { useCallback, useEffect, useState } from "react";
import { getMetrics } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Alert } from "@/components/ui/Alert";
import { RefreshBar } from "@/components/ui/RefreshBar";

type Metrics = {
  total_jobs?: number;
  failed_jobs?: number;
  total_insights?: number;
  pending_review?: number;
};

export default function OperationsPage() {
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
        eyebrow="Governance"
        title="Operations & Governance Dashboard"
        description="Pipeline throughput, failure rate, and review backlog — the health signals an ops team watches day to day."
        actions={<RefreshBar lastUpdated={lastUpdated} onRefresh={load} refreshing={refreshing} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total jobs" value={metrics?.total_jobs ?? "-"} />
        <StatTile label="Failed jobs" value={metrics?.failed_jobs ?? "-"} tone={metrics?.failed_jobs ? "danger" : "neutral"} />
        <StatTile label="Total insights" value={metrics?.total_insights ?? "-"} />
        <StatTile label="Pending review" value={metrics?.pending_review ?? "-"} tone={metrics?.pending_review ? "warning" : "neutral"} />
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </div>
  );
}
