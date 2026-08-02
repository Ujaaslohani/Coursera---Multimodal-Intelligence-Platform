"""Pulls real sample data from two public Hugging Face datasets via the
datasets-server REST API (no `datasets` library install required) and
reshapes it into this project's assets_manifest.json + raw_units format.

Sources (see data/README.md for full citations):
  - jamescalam/youtube-transcriptions  -> video + transcript modality
  - GEM/SciDuet                        -> slide modality

Honest limitation: these are two independently-sourced real datasets, not
the same lecture. They are NOT topically fused the way the hand-authored
`course_neural_networks/` sample is — this script produces a second,
separate demo asset group (`real_data/`) useful for testing ingestion,
embedding, and retrieval at more realistic volume/noise, not for the
tightly-matched cross-modal query demo (use `course_neural_networks/` for that).

Usage:
    python data/scripts/fetch_datasets.py
"""
import json
import urllib.request
import urllib.parse
from pathlib import Path

HEADERS = {"User-Agent": "coursera-mip-data-fetch/0.1"}
OUT_DIR = Path(__file__).resolve().parent.parent / "sample_assets" / "real_data"

# Chosen for topical coherence with each other (both NLP/sequence-modeling),
# not because the underlying datasets link them — see module docstring.
YOUTUBE_VIDEO_ID = "35Pdoyi6ZoQ"  # "Training and Testing an Italian BERT - Transformers From Scratch #4"
SCIDUET_PAPER_ID = "1062"  # "Neural Hidden Markov Model for Machine Translation"

MAX_TRANSCRIPT_CHUNKS = 20
MAX_SLIDES = 15


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def fetch_youtube_transcript(video_id: str, max_chunks: int) -> dict:
    rows = []
    offset = 0
    page_size = 100
    title = None
    while len(rows) < max_chunks:
        url = (
            "https://datasets-server.huggingface.co/rows"
            f"?dataset=jamescalam%2Fyoutube-transcriptions&config=default&split=train"
            f"&offset={offset}&length={page_size}"
        )
        page = fetch_json(url)
        page_rows = page.get("rows", [])
        if not page_rows:
            break
        for r in page_rows:
            row = r["row"]
            if row["video_id"] == video_id:
                title = title or row["title"]
                rows.append({"text": row["text"].strip(), "start": row["start"], "end": row["end"]})
                if len(rows) >= max_chunks:
                    break
        offset += page_size
        if offset > 5000:  # safety cap so a missing video_id can't loop forever
            break

    rows.sort(key=lambda u: u["start"])
    return {"title": title or f"video {video_id}", "video_id": video_id, "raw_units": rows}


def fetch_sciduet_slides(paper_id: str, max_slides: int) -> dict:
    query = urllib.parse.quote("neural network")
    url = (
        "https://datasets-server.huggingface.co/search"
        f"?dataset=GEM%2FSciDuet&config=default&split=train&query={query}&offset=0&length=100"
    )
    data = fetch_json(url)

    raw_units = []
    paper_title = None
    for r in data.get("rows", []):
        row = r["row"]
        if row["paper_id"] != paper_id:
            continue
        paper_title = paper_title or row["paper_title"]
        text = f"{row['slide_title']}. {row['slide_content_text']}".strip()
        if text:
            raw_units.append({"text": text, "metadata": {"slide_id": row["slide_id"]}})
        if len(raw_units) >= max_slides:
            break

    return {"title": paper_title or f"paper {paper_id}", "paper_id": paper_id, "raw_units": raw_units}


def build_manifest(video: dict, slides: dict) -> list[dict]:
    return [
        {
            "asset_id": f"real-video-{video['video_id']}",
            "modality": "video",
            "owner": "data-fetch-script",
            "topic": video["title"],
            "concept_tags": ["nlp", "transformers"],
            "storage_url": f"https://youtu.be/{video['video_id']}",
            "permission_scope": ["demo:real-data"],
        },
        {
            "asset_id": f"real-transcript-{video['video_id']}",
            "modality": "transcript",
            "owner": "data-fetch-script",
            "topic": video["title"],
            "concept_tags": ["nlp", "transformers"],
            "storage_url": "data/sample_assets/real_data/youtube_transcript.json",
            "permission_scope": ["demo:real-data"],
        },
        {
            "asset_id": f"real-slides-{slides['paper_id']}",
            "modality": "slide",
            "owner": "data-fetch-script",
            "topic": slides["title"],
            "concept_tags": ["nlp", "sequence-models"],
            "storage_url": "data/sample_assets/real_data/sciduet_slides.json",
            "permission_scope": ["demo:real-data"],
        },
    ]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Fetching transcript chunks for video {YOUTUBE_VIDEO_ID}...")
    video = fetch_youtube_transcript(YOUTUBE_VIDEO_ID, MAX_TRANSCRIPT_CHUNKS)
    print(f"  got {len(video['raw_units'])} chunks — '{video['title']}'")

    print(f"Fetching slides for SciDuet paper {SCIDUET_PAPER_ID}...")
    slides = fetch_sciduet_slides(SCIDUET_PAPER_ID, MAX_SLIDES)
    print(f"  got {len(slides['raw_units'])} slides — '{slides['title']}'")

    (OUT_DIR / "youtube_transcript.json").write_text(
        json.dumps(video["raw_units"], indent=2), encoding="utf-8"
    )
    (OUT_DIR / "sciduet_slides.json").write_text(
        json.dumps(slides["raw_units"], indent=2), encoding="utf-8"
    )

    manifest = build_manifest(video, slides)
    (OUT_DIR / "assets_manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    print(f"\nWrote {len(manifest)} asset entries + raw_units to {OUT_DIR}")
    if not video["raw_units"]:
        print(f"WARNING: no transcript chunks found for video_id={YOUTUBE_VIDEO_ID} — dataset schema/content may have changed.")
    if not slides["raw_units"]:
        print(f"WARNING: no slides found for paper_id={SCIDUET_PAPER_ID} — dataset schema/content may have changed.")


if __name__ == "__main__":
    main()
