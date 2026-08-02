type Theme = { label: string; count: number };

const BAR_COLOR = "#5B5FEC";

export default function FrictionThemeChart({ themes }: { themes: Theme[] }) {
  if (themes.length === 0) {
    return <p className="text-sm text-ink-400">No data yet.</p>;
  }
  const max = Math.max(1, ...themes.map((t) => t.count));

  return (
    <div className="space-y-3">
      {themes.map((t) => (
        <div key={t.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-ink-700">{t.label.replace(/_/g, " ")}</span>
            <span className="font-mono text-ink-400">{t.count}</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${Math.max(4, (t.count / max) * 100)}%`, backgroundColor: BAR_COLOR }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
