import Link from "next/link";
import type { EvidenceItem } from "@/lib/api";
import { modalityMeta } from "@/lib/domain";
import { Badge } from "@/components/ui/Badge";

function formatTimestamp(start: number | null, end: number | null): string | null {
  if (start == null) return null;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return end != null ? `${fmt(start)}–${fmt(end)}` : fmt(start);
}

export default function EvidencePanel({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return <p className="text-sm text-ink-400">No evidence retrieved yet.</p>;
  }

  return (
    <div className="space-y-2">
      {evidence.map((item) => {
        const meta = modalityMeta(item.modality);
        const ts = formatTimestamp(item.timestamp_start, item.timestamp_end);
        return (
          <div key={item.segment_id} className="rounded-lg border border-ink-100 bg-ink-50/60 p-3.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">
                {meta.icon} {meta.label}
              </Badge>
              <Badge tone={item.match_type === "visual" ? "brand" : "info"}>
                {item.match_type === "visual" ? "👁️ Visual match" : "🔤 Text match"}
              </Badge>
              {ts && <Badge tone="neutral">⏱ {ts}</Badge>}
              <span className="ml-auto text-xs font-medium text-ink-400">
                {(item.similarity * 100).toFixed(0)}% match
              </span>
            </div>
            <p className="whitespace-pre-line text-sm text-ink-700">{item.text_content}</p>
            <Link
              href={`/processing?asset_id=${item.asset_id}`}
              className="mt-1.5 inline-block text-xs text-brand-600 hover:underline"
            >
              View source asset →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
