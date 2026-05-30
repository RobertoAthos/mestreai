import base64
from io import BytesIO
from pathlib import Path
from typing import Optional

from pypdf import PdfReader, PdfWriter


def count_pages(pdf_path: Path) -> int:
    reader = PdfReader(str(pdf_path))
    return len(reader.pages)


def extract_single_page_pdf(pdf_path: Path, page_index: int = 0) -> bytes:
    """Return a one-page PDF holding only `page_index` of the source file.

    Each folha is served as a single-page document (the web viewer renders page
    1 and copies the whole blob). Out-of-range indices clamp to the last page so
    a stale manifest never 500s.
    """
    reader = PdfReader(str(pdf_path))
    if not reader.pages:
        raise ValueError("PDF sem páginas.")
    idx = max(0, min(page_index, len(reader.pages) - 1))
    writer = PdfWriter()
    writer.add_page(reader.pages[idx])
    buf = BytesIO()
    writer.write(buf)
    return buf.getvalue()


def extract_text(pdf_path: Path, max_pages: int = 20) -> str:
    reader = PdfReader(str(pdf_path))
    pieces: list[str] = []
    for i, page in enumerate(reader.pages[:max_pages]):
        text = page.extract_text() or ""
        if text.strip():
            pieces.append(f"--- Página {i + 1} ---\n{text.strip()}")
    return "\n\n".join(pieces)


def render_page_as_base64_png(
    pdf_path: Path, page_index: int = 0, dpi: int = 150, max_side: int = 1600
) -> Optional[str]:
    """Render a single PDF page as a base64-encoded PNG, downscaled so its
    longest side is <= ``max_side`` px.

    Vision models cap images near ~1568px on the long edge anyway, so bounding
    the size here keeps the prompt small when several folhas are sent at once.
    Returns None when pdf2image / poppler are unavailable — the caller falls
    back to text-only extraction.
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
    image = images[0]
    longest = max(image.size)
    if longest > max_side:
        scale = max_side / longest
        new_size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        try:
            from PIL import Image

            image = image.resize(new_size, Image.LANCZOS)
        except Exception:
            image = image.resize(new_size)
    buf = BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
