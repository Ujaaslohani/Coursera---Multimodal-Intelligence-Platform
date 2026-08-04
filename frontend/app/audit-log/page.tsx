"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { getAuditLog, AuditLogEntry } from "@/lib/api";
import { timeAgo } from "@/lib/domain";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Field";

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
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getAuditLog(100)
      .then(setEntries)
      .catch((err) => setError((err as Error).message));
  }, []);

  const actionTypes = useMemo(() => {
    const set = new Set((entries ?? []).map((e) => e.action));
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (actionFilter === "all") return entries;
    return entries.filter((e) => e.action === actionFilter);
  }, [entries, actionFilter]);

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit Log"
        description="Every mutating action across the platform — who did it, what it touched, and when. Requires the audit:read permission (analyst/admin roles). Click a row to see its full details."
        actions={
          entries && entries.length > 0 ? (
            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-56">
              <option value="all">All actions ({entries.length})</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {a} ({entries.filter((e) => e.action === a).length})
                </option>
              ))}
            </Select>
          ) : undefined
        }
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
                {filteredEntries.map((e) => {
                  const expanded = expandedId === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr
                        onClick={() => setExpandedId(expanded ? null : e.id)}
                        className="cursor-pointer border-b border-ink-50 last:border-0 hover:bg-ink-50/40"
                      >
                        <td className="px-4 py-2.5">
                          <Badge tone={ACTION_TONE[e.action] ?? "neutral"}>{e.action}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-600">{e.actor}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-400">
                          {e.resource_type ? `${e.resource_type}:${(e.resource_id ?? "").slice(0, 8)}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ink-400">
                          {timeAgo(e.created_at)} <span className="ml-1 text-ink-300">{expanded ? "▲" : "▼"}</span>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-ink-50 bg-ink-50/40 last:border-0">
                          <td colSpan={4} className="px-4 py-3">
                            <pre className="scrollbar-thin overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-100">
                              {JSON.stringify(e, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-ink-400">
                      No audit events {actionFilter === "all" ? "yet" : "for this action type"}.
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
