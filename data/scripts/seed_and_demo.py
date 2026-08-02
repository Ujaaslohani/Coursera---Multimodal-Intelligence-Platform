"""One-shot seeding + end-to-end demo script.

Registers every asset in the sample manifests, normalizes + embeds their
raw_units into Segment rows, then runs one real cross-modal query through
retrieval + synthesis so the whole pipeline (input -> preprocessing ->
embeddings -> unified query -> retrieval -> LLM synthesis) is proven live
against the real Supabase database, not just unit-tested.

Usage (from repo root):
    python data/scripts/seed_and_demo.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for path in (ROOT, ROOT / "backend", ROOT / "pipelines"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

from app.database.connection import SessionLocal, Base, engine
from app.database.models import Asset, Segment
import app.database.models  # noqa: registers models on Base
from ai.preprocessing.normalize import normalize_raw_units
from ai.embeddings.embed import embed_segment
from ai.retrieval.retriever import retrieve
from ai.synthesis.synthesizer import synthesize
from pipelines.text_processing.clean import process_quiz

DATA_DIR = ROOT / "data"

MANIFESTS_WITH_UNITS = [
    {
        "manifest": DATA_DIR / "sample_assets" / "assets_manifest.json",
        "raw_units_map": {
            "a2-transcript-backprop": DATA_DIR / "sample_assets" / "course_neural_networks" / "transcript.json",
            "a3-slide-backprop": DATA_DIR / "sample_assets" / "course_neural_networks" / "slides.json",
            "a4-quiz-backprop": DATA_DIR / "sample_assets" / "course_neural_networks" / "quiz.json",
            "a5-discussion-backprop": DATA_DIR / "sample_assets" / "course_neural_networks" / "discussion.json",
        },
    },
    {
        "manifest": DATA_DIR / "sample_assets" / "real_data" / "assets_manifest.json",
        "raw_units_map": {
            "real-transcript-35Pdoyi6ZoQ": DATA_DIR / "sample_assets" / "real_data" / "youtube_transcript.json",
            "real-slides-1062": DATA_DIR / "sample_assets" / "real_data" / "sciduet_slides.json",
        },
    },
]


def seed(db) -> dict:
    """Returns {manifest_asset_id: db_asset_id} and prints progress."""
    id_map = {}
    total_segments = 0

    for group in MANIFESTS_WITH_UNITS:
        if not group["manifest"].exists():
            print(f"  skipping {group['manifest']} — not present in this checkout")
            continue
        entries = json.loads(group["manifest"].read_text(encoding="utf-8"))
        for entry in entries:
            asset = Asset(
                modality=entry["modality"],
                owner=entry["owner"],
                topic=entry.get("topic"),
                concept_tags=entry.get("concept_tags", []),
                storage_url=entry["storage_url"],
                permission_scope=entry.get("permission_scope", []),
            )
            db.add(asset)
            db.commit()
            db.refresh(asset)
            id_map[entry["asset_id"]] = asset.id
            print(f"  registered {entry['modality']:12s} {entry['asset_id']:32s} -> {asset.id}")

            raw_units_path = group["raw_units_map"].get(entry["asset_id"])
            if raw_units_path is None:
                continue  # e.g. the video assets themselves have no text raw_units

            raw_data = json.loads(raw_units_path.read_text(encoding="utf-8"))
            if entry["modality"] == "quiz":
                # quiz.json is {question, answer_pattern, difficulty} — pipelines/text_processing
                # reshapes it into the {text, metadata} raw_units contract normalize_raw_units expects.
                raw_units = process_quiz(asset.id, raw_data)["raw_units"]
            else:
                raw_units = raw_data

            normalized = normalize_raw_units(
                asset_id=asset.id,
                modality=entry["modality"],
                raw_units=raw_units,
                permission_scope=entry.get("permission_scope", []),
            )
            for seg in normalized:
                db.add(Segment(
                    asset_id=seg.asset_id,
                    modality=seg.modality,
                    text_content=seg.text_content,
                    timestamp_start=seg.timestamp_start,
                    timestamp_end=seg.timestamp_end,
                    embedding=embed_segment(seg.text_content),
                    segment_metadata=seg.metadata,
                ))
            db.commit()
            total_segments += len(normalized)
            print(f"    -> embedded {len(normalized)} segments")

    print(f"\nTotal assets registered: {len(id_map)}")
    print(f"Total segments embedded: {total_segments}")
    return id_map


def run_demo_query(db, question: str):
    print(f"\n--- Query: {question!r} ---")
    evidence = retrieve(db, question, permitted_sources=["*"], top_k=8)
    print(f"Retrieved {len(evidence)} evidence segments:")
    for e in evidence:
        preview = e.text_content[:80].replace("\n", " ")
        print(f"  [{e.modality:10s} sim={e.similarity:.3f}] {preview}...")

    result = synthesize(question, evidence)
    print("\nSynthesized answer:")
    print(" ", result.get("answer"))
    print(" confidence:", result.get("confidence"))
    print(" recommended_action:", result.get("recommended_action"))
    print(" citations:")
    for c in result.get("citations", []):
        print("   -", c)


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Seeding assets + segments...\n")
        seed(db)

        run_demo_query(db, "Why are learners struggling with the backpropagation concept?")
        run_demo_query(db, "What do learners say is missing from the backpropagation lesson?")
    finally:
        db.close()


if __name__ == "__main__":
    main()
