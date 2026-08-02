import Link from "next/link";

const SURFACES = [
  { href: "/assets", title: "Asset Intake Console", desc: "Upload and register video, image, slide, transcript, quiz, and discussion assets." },
  { href: "/processing", title: "Processing Monitor", desc: "Track preprocessing, embedding, and indexing job status." },
  { href: "/query", title: "Unified Query Workspace", desc: "Ask cross-modal questions and inspect cited evidence." },
  { href: "/dashboard", title: "Learning Analytics Dashboard", desc: "Friction themes, confusion clusters, engagement signals." },
  { href: "/recommendations", title: "Recommendation Workspace", desc: "Review, accept, edit, or reject AI-generated recommendations." },
  { href: "/operations", title: "Operations Dashboard", desc: "Pipeline health, retrieval quality, usage metrics." },
];

export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-900 mb-2">Multimodal Intelligence Platform</h1>
      <p className="text-gray-600 mb-6">
        A governed AI platform for cross-modal learning analytics, content intelligence, and
        evidence-backed improvement recommendations.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SURFACES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold text-blue-800">{s.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
