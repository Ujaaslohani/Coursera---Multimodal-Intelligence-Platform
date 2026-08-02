"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMetrics } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardContent } from "@/components/ui/Card";

type Metrics = {
  total_assets?: number;
  total_segments_indexed?: number;
  total_insights?: number;
  pending_review?: number;
  failed_jobs?: number;
};

const SURFACES = [
  {
    href: "/assets",
    title: "Asset Intake Console",
    desc: "Register video, image, slide, transcript, quiz, and discussion assets.",
    icon: "📤",
  },
  {
    href: "/processing",
    title: "Processing Monitor",
    desc: "Track a job across all 9 lifecycle stages, from upload to archive.",
    icon: "⚙️",
  },
  {
    href: "/query",
    title: "Unified Query Workspace",
    desc: "Ask cross-modal questions, see the agent's plan, and inspect cited evidence.",
    icon: "🔎",
  },
  {
    href: "/recommendations",
    title: "Recommendation Workspace",
    desc: "Review, accept, edit, or reject AI-generated recommendations.",
    icon: "📋",
  },
  {
    href: "/dashboard",
    title: "Learning Analytics Dashboard",
    desc: "Friction themes, pipeline health, and review outcomes.",
    icon: "📊",
  },
  {
    href: "/operations",
    title: "Operations Dashboard",
    desc: "Pipeline health, retrieval quality, and usage metrics.",
    icon: "🛰️",
  },
  {
    href: "/audit-log",
    title: "Audit Log",
    desc: "Every mutating action, who did it, and when — governance-ready.",
    icon: "🔐",
  },
];

export default function HomePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    getMetrics()
      .then((m) => setMetrics(m as Metrics))
      .catch(() => setMetrics(null));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Coursera · Governed AI Platform"
        title="Multimodal Intelligence Platform"
        description="Cross-modal learning analytics, content intelligence, and evidence-backed improvement recommendations — from raw video and text to a human-reviewed insight."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Assets" value={metrics?.total_assets ?? "—"} />
        <StatTile label="Segments indexed" value={metrics?.total_segments_indexed ?? "—"} />
        <StatTile label="Pending review" value={metrics?.pending_review ?? "—"} tone="warning" />
        <StatTile label="Failed jobs" value={metrics?.failed_jobs ?? "—"} tone={metrics?.failed_jobs ? "danger" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SURFACES.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-shadow hover:shadow-popover">
              <CardContent className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg">
                  {s.icon}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">{s.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
