"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/assets", label: "Assets" },
  { href: "/processing", label: "Processing" },
  { href: "/query", label: "Query" },
  { href: "/recommendations", label: "Review" },
  { href: "/dashboard", label: "Analytics" },
  { href: "/operations", label: "Operations" },
  { href: "/audit-log", label: "Audit Log" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 border-b border-ink-100 bg-white/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link href="/" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
          M
        </Link>
        <nav className="scrollbar-thin flex gap-1 overflow-x-auto">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
