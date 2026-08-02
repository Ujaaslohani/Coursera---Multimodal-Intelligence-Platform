"""Normalize raw pipeline output (from coursera-mip-pipelines) into the
consistent segment schema required before embedding, per doc §5.4
'Preprocessing and Data Normalization': all modality records must use
consistent schemas for source ID, segment ID, modality, timestamp, topic,
and permissions.
"""
from dataclasses import dataclass, field


@dataclass
class NormalizedSegment:
    asset_id: str
    modality: str  # video | image | slide | transcript | quiz | discussion
    text_content: str
    timestamp_start: float | None = None
    timestamp_end: float | None = None
    topic: str | None = None
    permission_scope: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


def normalize_raw_units(asset_id: str, modality: str, raw_units: list[dict],
                         permission_scope: list[str] | None = None) -> list[NormalizedSegment]:
    """raw_units come from pipelines/{video,image,text}_processing outputs,
    e.g. [{"text": "...", "start": 12.0, "end": 18.5, "topic": "..."}]
    """
    permission_scope = permission_scope or []
    normalized = []
    for unit in raw_units:
        text = (unit.get("text") or "").strip()
        if not text:
            continue  # drop empty segments rather than embedding noise
        normalized.append(
            NormalizedSegment(
                asset_id=asset_id,
                modality=modality,
                text_content=text,
                timestamp_start=unit.get("start"),
                timestamp_end=unit.get("end"),
                topic=unit.get("topic"),
                permission_scope=permission_scope,
                metadata={k: v for k, v in unit.items() if k not in {"text", "start", "end", "topic"}},
            )
        )
    return normalized
