type Evidence = Record<string, unknown>;

export default function EvidencePanel({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return <p className="text-sm text-gray-500">No evidence retrieved yet.</p>;
  }

  return (
    <div className="space-y-2">
      {evidence.map((item, idx) => (
        <div key={idx} className="border rounded-lg p-3 text-sm bg-gray-50">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{String(item.modality ?? "unknown modality")}</span>
            <span>{String(item.timestamp_start ?? "")}</span>
          </div>
          <p>{String(item.text_content ?? "(no text preview)")}</p>
        </div>
      ))}
    </div>
  );
}
