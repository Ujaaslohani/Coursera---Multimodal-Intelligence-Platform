"""Image/slide preprocessing per doc §5.4: parse visual descriptors, text
where available, layout metadata, and reference identifiers. v1 scope
simplification (see architecture discussion): OCR/caption text is embedded
as the searchable representation rather than raw pixel embeddings — this
keeps a single text-embedding pipeline for all modalities.
"""
from pathlib import Path

import fitz  # PyMuPDF, for slide decks
import pytesseract
from PIL import Image


def ocr_image(image_path: str) -> str:
    return pytesseract.image_to_string(Image.open(image_path)).strip()


def extract_slide_text(pdf_path: str) -> list[dict]:
    """Returns raw units, one per slide/page: [{"text": ..., "topic": None}, ...]"""
    doc = fitz.open(pdf_path)
    units = []
    for page_number, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            units.append({"text": text, "metadata": {"page": page_number + 1}})
    return units


def process_image(asset_id: str, image_path: str) -> dict:
    text = ocr_image(image_path)
    return {
        "asset_id": asset_id,
        "modality": "image",
        "raw_units": [{"text": text}] if text else [],
    }


def process_slides(asset_id: str, pdf_path: str) -> dict:
    return {
        "asset_id": asset_id,
        "modality": "slide",
        "raw_units": extract_slide_text(pdf_path),
    }
