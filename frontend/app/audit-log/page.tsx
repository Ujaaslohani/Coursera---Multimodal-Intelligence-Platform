"use client";

import { useEffect, useState } from "react";
import { getAuditLog, AuditLogEntry } from "@/lib/api";
import { timeAgo } from "@/lib/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

const ACTION_TONE: Record<string, "brand" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  "asset.register": "info",
  "processing_job.run": "brand",
  "processing_job.archive": "neutral",
  "query.run": "info",
  "insight.synthesize": "brand",
  "insight.review": "success",
  "embeddings.refresh": "neutral",
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuditLog(100)
      .then(setEntries)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit Log"
        description="Every mutating action across the platform — who did it, what it touched, and when. Requires the audit:read permission (analyst/admin roles)."
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {entries && (
        <Card className="overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Actor</th>
                  <th className="px-4 py-2.5 font-medium">Resource</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/40">
                    <td className="px-4 py-2.5">
                      <Badge tone={ACTION_TONE[e.action] ?? "neutral"}>{e.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-600">{e.actor}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-400">
                      {e.resource_type ? `${e.resource_type}:${(e.resource_id ?? "").slice(0, 8)}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-400">{timeAgo(e.created_at)}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-ink-400">
                      No audit events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
