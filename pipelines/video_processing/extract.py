"""Video preprocessing per doc §5.4: segment video into timestamps, frames,
and transcript-aligned units. Uses FFmpeg for frame extraction and the
Whisper API for transcript + timestamp alignment, per doc §6.2 tech choices.
"""
import subprocess
from pathlib import Path

from openai import OpenAI


def extract_thumbnails(video_path: str, output_dir: str, interval_seconds: int = 30) -> list[str]:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    pattern = str(Path(output_dir) / "frame_%04d.jpg")
    subprocess.run(
        ["ffmpeg", "-i", video_path, "-vf", f"fps=1/{interval_seconds}", pattern, "-y"],
        check=True,
        capture_output=True,
    )
    return sorted(str(p) for p in Path(output_dir).glob("frame_*.jpg"))


def transcribe_with_timestamps(video_path: str, api_key: str) -> list[dict]:
    """Returns raw units: [{"text": ..., "start": ..., "end": ...}, ...]"""
    client = OpenAI(api_key=api_key)
    with open(video_path, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    return [
        {"text": seg.text.strip(), "start": seg.start, "end": seg.end}
        for seg in transcript.segments
        if seg.text.strip()
    ]


def process_video(asset_id: str, video_path: str, api_key: str, thumbnail_dir: str) -> dict:
    return {
        "asset_id": asset_id,
        "modality": "video",
        "thumbnails": extract_thumbnails(video_path, thumbnail_dir),
        "raw_units": transcribe_with_timestamps(video_path, api_key),
    }
