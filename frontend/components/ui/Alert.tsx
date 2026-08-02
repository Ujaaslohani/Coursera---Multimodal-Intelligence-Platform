import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  danger: "border-danger-200 bg-danger-50 text-danger-700",
  success: "border-success-200 bg-success-50 text-success-700",
  info: "border-info-500/20 bg-info-50 text-info-600",
};

export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "info";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border px-3.5 py-2.5 text-sm", TONE_CLASSES[tone])} role={tone === "danger" ? "alert" : "status"}>
      {children}
    </div>
  );
}
