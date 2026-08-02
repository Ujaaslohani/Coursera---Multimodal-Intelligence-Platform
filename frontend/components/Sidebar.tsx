"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    label: "Ingestion",
    items: [
      { href: "/assets", label: "Asset Intake", icon: "📤" },
      { href: "/processing", label: "Processing Monitor", icon: "⚙️" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/query", label: "Query Workspace", icon: "🔎" },
      { href: "/recommendations", label: "Recommendations", icon: "📋" },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/dashboard", label: "Analytics Dashboard", icon: "📊" },
      { href: "/operations", label: "Operations", icon: "🛰️" },
      { href: "/audit-log", label: "Audit Log", icon: "🔐" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-ink-100 bg-white lg:flex">
      <Link href="/" className="flex items-center gap-2 border-b border-ink-100 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          M
        </span>
        <span className="text-sm font-semibold leading-tight text-ink-900">
          Multimodal
          <br />
          Intelligence
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                    )}
                  >
                    <span className="text-[15px]" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-100 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">
            A
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink-800">frontend-dev</p>
            <p className="truncate text-[11px] text-ink-400">admin role</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
