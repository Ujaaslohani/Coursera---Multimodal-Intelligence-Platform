"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyableId({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (e.g. insecure context) — fail silently, value is still selectable text
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-2 py-1 font-mono text-xs text-ink-700 hover:bg-ink-50",
        className
      )}
    >
      {value}
      <span className="text-ink-400">{copied ? "✓ copied" : "⧉"}</span>
    </button>
  );
}
