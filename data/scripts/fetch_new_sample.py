"""One-off fetch of NEW real Hugging Face content — different video_id and
paper_id than data/scripts/fetch_datasets.py already pulled, so you can test
ingestion against content that's genuinely not in the database yet.

Usage: python data/scripts/fetch_new_sample.py
"""
import json
import urllib.parse
import urllib.request
from pathlib import Path

HEADERS = {"User-Agent": "coursera-mip-data-fetch/0.1"}
OUT_DIR = Path(__file__).resolve().parent.parent / "sample_assets" / "real_data_new"

VIDEO_ID = "fGwH2YoQkDM"  # "CLIP Explained | Multi-modal ML"
PAPER_ID = "1212"  # "Encoding of phonology in a recurrent neural model of grounded speech"


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as resp:
        return json.loads(resp.read().decode())


def fetch_youtube_transcript(video_id: str, max_chunks: int = 20) -> dict:
    rows, offset, page_size, title = [], 0, 100, None
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
        if offset > 12000:
            break
    rows.sort(key=lambda u: u["start"])
    return {"title": title or f"video {video_id}", "video_id": video_id, "raw_units": rows}


def fetch_sciduet_slides(paper_id: str, max_slides: int = 15) -> dict:
    query = urllib.parse.quote("image classification")
    url = (
        "https://datasets-server.huggingface.co/search"
        f"?dataset=GEM%2FSciDuet&config=default&split=train&query={query}&offset=0&length=100"
    )
    data = fetch_json(url)
    raw_units, paper_title = [], None
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


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Fetching transcript chunks for video {VIDEO_ID}...")
    video = fetch_youtube_transcript(VIDEO_ID)
    print(f"  got {len(video['raw_units'])} chunks — '{video['title']}'")

    print(f"Fetching slides for SciDuet paper {PAPER_ID}...")
    slides = fetch_sciduet_slides(PAPER_ID)
    print(f"  got {len(slides['raw_units'])} slides — '{slides['title']}'")

    (OUT_DIR / "transcript.json").write_text(json.dumps(video["raw_units"], indent=2), encoding="utf-8")
    (OUT_DIR / "slides.json").write_text(json.dumps(slides["raw_units"], indent=2), encoding="utf-8")

    manifest = [
        {
            "asset_id": f"new-transcript-{VIDEO_ID}",
            "modality": "transcript",
            "owner": "manual-test@coursera.org",
            "topic": video["title"],
            "concept_tags": ["clip", "multimodal-ml"],
            "storage_url": f"data/sample_assets/real_data_new/transcript.json",
            "permission_scope": ["course:manual-test"],
        },
        {
            "asset_id": f"new-slides-{PAPER_ID}",
            "modality": "slide",
            "owner": "manual-test@coursera.org",
            "topic": slides["title"],
            "concept_tags": ["phonology", "speech-recognition"],
            "storage_url": f"data/sample_assets/real_data_new/slides.json",
            "permission_scope": ["course:manual-test"],
        },
    ]
    (OUT_DIR / "assets_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"\nWrote {len(manifest)} asset entries to {OUT_DIR}")
    print("Register them via the Asset Intake UI with these storage_url values:")
    for m in manifest:
        print(f"  {m['modality']:12s} {m['storage_url']}")


if __name__ == "__main__":
    main()
