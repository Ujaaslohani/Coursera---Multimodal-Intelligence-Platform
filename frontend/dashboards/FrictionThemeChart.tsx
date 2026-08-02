type Theme = { label: string; count: number };

export default function FrictionThemeChart({ themes }: { themes: Theme[] }) {
  const max = Math.max(1, ...themes.map((t) => t.count));

  return (
    <div className="space-y-2">
      {themes.map((t) => (
        <div key={t.label} className="text-sm">
          <div className="flex justify-between mb-1">
            <span>{t.label}</span>
            <span className="text-gray-500">{t.count}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded">
            <div
              className="h-2 bg-blue-700 rounded"
              style={{ width: `${(t.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
