import { cn } from "@/lib/utils";
import { JOB_STAGE_ORDER, STAGE_LABELS, stageIndex } from "@/lib/domain";

export function StageProgress({ stage }: { stage: string }) {
  if (stage === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-danger-600">
        <span className="h-2 w-2 rounded-full bg-danger-500" />
        Failed
      </div>
    );
  }

  const current = stageIndex(stage);

  return (
    <div className="flex items-center gap-1">
      {JOB_STAGE_ORDER.map((s, i) => (
        <div key={s} className="group relative flex flex-col items-center">
          <div
            className={cn(
              "h-1.5 w-6 rounded-full transition-colors sm:w-8",
              i <= current ? "bg-brand-500" : "bg-ink-100"
            )}
          />
          <div className="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-[11px] text-white group-hover:block">
            {STAGE_LABELS[s]}
          </div>
        </div>
      ))}
      <span className="ml-2 text-xs font-medium text-ink-500">{STAGE_LABELS[stage] ?? stage}</span>
    </div>
  );
}
