import base64
from io import BytesIO
from pathlib import Path
from typing import Optional

from pypdf import PdfReader


def count_pages(pdf_path: Path) -> int:
    reader = PdfReader(str(pdf_path))
    return len(reader.pages)


def extract_text(pdf_path: Path, max_pages: int = 20) -> str:
    reader = PdfReader(str(pdf_path))
    pieces: list[str] = []
    for i, page in enumerate(reader.pages[:max_pages]):
        text = page.extract_text() or ""
        if text.strip():
            pieces.append(f"--- Página {i + 1} ---\n{text.strip()}")
    return "\n\n".join(pieces)


def render_page_as_base64_png(pdf_path: Path, page_index: int = 0, dpi: int = 150) -> Optional[str]:
    """Render a single PDF page as a base64-encoded PNG.

    Returns None when pdf2image / poppler are unavailable in the runtime — the
    caller falls back to text-only extraction.
    """
    try:
        from pdf2image import convert_from_path
    except Exception:
        return None
    try:
        images = convert_from_path(str(pdf_path), dpi=dpi, first_page=page_index + 1, last_page=page_index + 1)
    except Exception:
        return None
    if not images:
        return None
    buf = BytesIO()
    images[0].save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
