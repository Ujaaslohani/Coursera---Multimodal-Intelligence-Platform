# pipelines

Modality-specific preprocessing, per doc §7.1/§5.4. Converts raw uploaded
assets into the `raw_units` shape (`{"text", "start"?, "end"?, "topic"?}`)
that `ai/preprocessing/normalize.py` turns into searchable segments.

```
video_processing/    # FFmpeg frame extraction + Whisper transcript alignment
image_processing/    # OCR (Tesseract) for images, PyMuPDF text extraction for slide decks
text_processing/     # Cleaning/deduplication for quiz text and discussion threads
indexing/            # Bridges pipeline output -> ai/preprocessing -> Segment rows -> embeddings
```

`indexing/index_segments.py` is the entry point called after a processing
job reaches `preprocessed`: it normalizes, embeds, persists segments, and
advances the job to `indexed` (see `backend/app/database/models.py` `JobStage`).
`backend/app/services/processing_service.py` is the real orchestration path —
it's what `POST /api/processing-jobs` actually calls.

## System dependencies — verified status in this environment

- `ffmpeg` — **not installed** (checked: `which ffmpeg` fails; a stale PATH
  entry points at a deleted folder). Video jobs fail visibly with a clear
  `ProcessingError` rather than silently no-op'ing — see
  `processing_service._load_raw_units`.
- `tesseract-ocr` — **not installed** (checked: `which tesseract` fails).
  Image OCR jobs fail the same way. Slide **PDFs** are unaffected — PyMuPDF
  (`extract_slide_text`) has no system-binary dependency and works today;
  only raster-image OCR and video frame/transcript extraction are blocked.
- Install `ffmpeg` (e.g. `choco install ffmpeg` on Windows, `apt-get install
  ffmpeg` on Linux) and `tesseract-ocr` (`choco install tesseract` /
  `apt-get install tesseract-ocr`) to unblock those two modalities. Not
  installed automatically — that's a system-wide change outside this
  project's scope to make unprompted.

Everything else in the pipeline — text/discussion/quiz cleaning, slide PDF
extraction, normalization, embedding, indexing, retrieval, synthesis — has
been run for real against a live Supabase database, not just unit-tested.

## Install

```bash
pip install -r pipelines/requirements.txt
```
