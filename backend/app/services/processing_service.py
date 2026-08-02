"""Orchestrates POST /api/processing-jobs: actually runs the matching
pipelines/*_processing step against an asset's storage_url and indexes the
result, rather than just flipping a status column. This is the real wiring
doc §5.4 describes — preprocessing -> normalization -> embedding -> indexed.

Known environment constraint: video (FFmpeg) and raster-image OCR
(Tesseract) processing require system binaries that are not installed in
this environment (see pipelines/README.md). Jobs for those modalities fail
visibly with a clear error rather than silently no-op'ing, per doc §5.5
"The platform must ... fail visibly when evidence is incomplete."
Slide PDFs are still processed for real (PyMuPDF has no system-binary
dependency); JSON-shaped sample assets skip straight to normalization since
they represent already-extracted raw_units.
"""
import json
import os
import shutil
from pathlib import Path

from sqlalchemy.orm import Session

from app.database.models import Asset, ProcessingJob, Segment, JobStage
from app.jobs.job_queue import get_job, advance_job
from ai.preprocessing.normalize import normalize_raw_units
from ai.embeddings.embed import embed_segment
from pipelines.text_processing.clean import process_quiz, process_discussion_thread
from pipelines.image_processing.extract import extract_slide_text, process_image
from pipelines.video_processing.extract import process_video

REPO_ROOT = Path(__file__).resolve().parents[3]

# Fallback install locations for machines where ffmpeg/tesseract were just
# installed but the current process's PATH predates the install (a long-lived
# shell won't pick up a Windows user-PATH registry change without a restart).
_FALLBACK_BINARY_DIRS = [
    r"C:\Program Files\Tesseract-OCR",
]


def _ensure_binary_on_path(binary_name: str) -> bool:
    if shutil.which(binary_name):
        return True
    for extra_dir in _FALLBACK_BINARY_DIRS:
        if (Path(extra_dir) / f"{binary_name}.exe").exists():
            os.environ["PATH"] = extra_dir + os.pathsep + os.environ.get("PATH", "")
            return True
    # ffmpeg ships wherever it was unzipped, not a fixed path — search common user locations
    if binary_name == "ffmpeg":
        for candidate in Path.home().glob("tools/**/bin/ffmpeg.exe"):
            os.environ["PATH"] = str(candidate.parent) + os.pathsep + os.environ.get("PATH", "")
            return True
    return shutil.which(binary_name) is not None


class ProcessingError(Exception):
    pass


def _load_raw_units(asset: Asset) -> list[dict]:
    source_path = REPO_ROOT / asset.storage_url

    if asset.modality.value == "video":
        if not _ensure_binary_on_path("ffmpeg"):
            raise ProcessingError(
                "Video preprocessing requires ffmpeg, which is not installed/on PATH in this environment."
            )
        if not source_path.exists():
            raise ProcessingError(f"storage_url does not resolve to a local file: {asset.storage_url}")
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ProcessingError("OPENAI_API_KEY is not configured — required for Whisper transcription.")
        thumbnail_dir = REPO_ROOT / "data" / "generated_thumbnails" / asset.id
        result = process_video(asset.id, str(source_path), api_key=api_key, thumbnail_dir=str(thumbnail_dir))
        return result["raw_units"]

    if asset.modality.value == "image" and source_path.suffix.lower() != ".pdf":
        if not _ensure_binary_on_path("tesseract"):
            raise ProcessingError(
                "Image OCR requires tesseract, which is not installed/on PATH in this environment."
            )
        if not source_path.exists():
            raise ProcessingError(f"storage_url does not resolve to a local file: {asset.storage_url}")
        result = process_image(asset.id, str(source_path))
        return result["raw_units"]

    if not source_path.exists():
        raise ProcessingError(f"storage_url does not resolve to a local file: {asset.storage_url}")

    if source_path.suffix.lower() == ".pdf":
        return extract_slide_text(str(source_path))  # real PyMuPDF extraction, no system binary needed

    raw = json.loads(source_path.read_text(encoding="utf-8"))

    if asset.modality.value == "quiz":
        return process_quiz(asset.id, raw)["raw_units"]
    if asset.modality.value == "discussion":
        return process_discussion_thread(asset.id, raw)["raw_units"]

    # transcript / slide (already-extracted JSON) are already in raw_units shape
    return raw


def run_processing_job(db: Session, job_id: str) -> ProcessingJob:
    job = get_job(db, job_id)
    if job is None:
        raise ProcessingError(f"job {job_id} not found")

    asset = db.query(Asset).filter(Asset.id == job.asset_id).first()
    if asset is None:
        return advance_job(db, job_id, JobStage.failed, error=f"asset {job.asset_id} not found")

    try:
        raw_units = _load_raw_units(asset)
    except ProcessingError as e:
        return advance_job(db, job_id, JobStage.failed, error=str(e))

    advance_job(db, job_id, JobStage.preprocessed)

    normalized = normalize_raw_units(
        asset_id=asset.id,
        modality=asset.modality.value,
        raw_units=raw_units,
        permission_scope=asset.permission_scope,
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

    advance_job(db, job_id, JobStage.embedded)
    return advance_job(db, job_id, JobStage.indexed)
