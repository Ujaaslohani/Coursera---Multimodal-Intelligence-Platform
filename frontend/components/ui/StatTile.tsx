import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  const valueColor =
    tone === "danger"
      ? "text-danger-600"
      : tone === "warning"
      ? "text-warning-600"
      : tone === "success"
      ? "text-success-600"
      : "text-ink-900";

  return (
    <div className="rounded-xl2 border border-ink-100 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold", valueColor)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
