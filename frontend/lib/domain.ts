export const MODALITIES = ["video", "image", "slide", "transcript", "quiz", "discussion"] as const;

export const MODALITY_META: Record<string, { label: string; icon: string }> = {
  video: { label: "Video", icon: "🎬" },
  image: { label: "Image", icon: "🖼️" },
  slide: { label: "Slide", icon: "📑" },
  transcript: { label: "Transcript", icon: "📝" },
  quiz: { label: "Quiz", icon: "✅" },
  discussion: { label: "Discussion", icon: "💬" },
};

export function modalityMeta(modality: string) {
  return MODALITY_META[modality] ?? { label: modality, icon: "📄" };
}

// Order matches app.database.models.JOB_STAGE_PROGRESSION on the backend.
export const JOB_STAGE_ORDER = [
  "uploaded",
  "preprocessed",
  "embedded",
  "indexed",
  "searchable",
  "retrieved",
  "synthesized",
  "reviewed",
  "archived",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  preprocessed: "Preprocessed",
  embedded: "Embedded",
  indexed: "Indexed",
  searchable: "Searchable",
  retrieved: "Retrieved",
  synthesized: "Synthesized",
  reviewed: "Reviewed",
  archived: "Archived",
  failed: "Failed",
};

export function stageIndex(stage: string): number {
  return JOB_STAGE_ORDER.indexOf(stage as (typeof JOB_STAGE_ORDER)[number]);
}

export const DECISION_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  accept: { label: "Accepted", tone: "success" },
  edit: { label: "Edited", tone: "warning" },
  reject: { label: "Rejected", tone: "danger" },
  escalate: { label: "Escalated", tone: "info" },
  pending_review: { label: "Pending review", tone: "warning" },
};

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
