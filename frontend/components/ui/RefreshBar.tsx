"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export function RefreshBar({
  lastUpdated,
  onRefresh,
  refreshing,
}: {
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [, forceTick] = useState(0);

  // Re-render every few seconds purely so "X ago" stays current without a refetch.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const secondsAgo = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000)) : null;
  const label =
    secondsAgo === null ? "" : secondsAgo < 5 ? "just now" : secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.round(secondsAgo / 60)}m ago`;

  return (
    <div className="flex items-center gap-2">
      {lastUpdated && <span className="text-xs text-ink-400">Updated {label}</span>}
      <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? "Refreshing…" : "↻ Refresh"}
      </Button>
    </div>
  );
}
