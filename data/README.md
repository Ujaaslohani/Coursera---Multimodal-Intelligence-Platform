# data

Sample assets, schemas, and evaluation fixtures, per doc §7.1/§6.3.

```
sample_assets/
  assets_manifest.json     # hand-authored demo course ("Backpropagation") spanning all 6 modalities
  course_neural_networks/
    transcript.json          # raw_units for pipelines/video_processing output
    slides.json                # raw_units for pipelines/image_processing (slide text)
    quiz.json                    # raw_units for pipelines/text_processing (quiz)
    discussion.json                # raw_units for pipelines/text_processing (discussion)
  real_data/                # fetched from public datasets — see scripts/fetch_datasets.py
    assets_manifest.json
    youtube_transcript.json    # real video+transcript chunks (jamescalam/youtube-transcriptions)
    sciduet_slides.json        # real slide text (GEM/SciDuet)
scripts/
  fetch_datasets.py       # pulls real_data/ above from Hugging Face's datasets-server API
schemas/                 # JSON Schema for Asset, Segment, Insight records
sample_queries.json      # example unified-query questions with expected modality coverage
evaluation_cases.json    # benchmark cases for ai/evaluation/evaluate.py
```

## Real vs. hand-authored data

- `course_neural_networks/` — hand-authored, all 6 modalities tightly matched
  to one concept ("backpropagation"). Use this for the cross-modal query demo
  in `docs/demo_script.md` — it's the only set where a query can meaningfully
  pull evidence from every modality on the *same* topic.
- `real_data/` — pulled from two real, independent open datasets (real
  video+transcript, real slide text). They are topically related (both
  NLP/sequence models) but **not the same lecture** — no open dataset exists
  that ties video, slides, quiz, and discussion to one course. Useful for
  testing ingestion/embedding/retrieval against real-world noisy text at
  more volume than the hand-authored set. Re-run
  `python data/scripts/fetch_datasets.py` to refresh or point it at a
  different `YOUTUBE_VIDEO_ID`/`SCIDUET_PAPER_ID`.
- Quiz and discussion modalities have no viable open, topic-matched source
  (see conversation history) — `course_neural_networks/quiz.json` and
  `discussion.json` remain hand-authored. Stanford MOOCPosts
  (https://datastage.stanford.edu/StanfordMoocPosts/) is real MOOC
  discussion data but requires an academic-access request, so it isn't
  wired into the fetch script.

## Seeding the demo

1. POST each entry in `sample_assets/assets_manifest.json` to `/api/assets`.
2. Run the matching `pipelines/*_processing` step on each asset's raw file to
   produce `raw_units`, then `pipelines/indexing/index_segments.py` to embed
   and index them.
3. Run the questions in `sample_queries.json` against `/api/query` +
   `/api/synthesize` to produce a demo-ready cited insight.

`evaluation_cases.json` uses `expected_asset_ids` rather than segment IDs
because segment IDs are only assigned once the sample assets are actually
seeded and indexed — see notes in the file itself.
