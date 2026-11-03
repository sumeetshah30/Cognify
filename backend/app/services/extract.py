"""Turn uploaded files into (locator, text) pages and then into overlapping chunks."""
from pathlib import Path

DOC_EXT = {".pdf", ".docx", ".txt", ".md"}
DATA_EXT = {".csv", ".xlsx"}


def kind_for(name: str) -> str | None:
    ext = Path(name).suffix.lower()
    if ext in DOC_EXT:
        return "document"
    if ext in DATA_EXT:
        return "dataset"
    return None


def extract_pages(path: str) -> list[tuple[str, str]]:
    ext = Path(path).suffix.lower()
    if ext == ".pdf":
        from pypdf import PdfReader
        return [(f"p. {i}", (p.extract_text() or "")) for i, p in enumerate(PdfReader(path).pages, 1)]
    if ext == ".docx":
        from docx import Document as Docx
        d = Docx(path)
        lines = [p.text for p in d.paragraphs if p.text.strip()]
        for t in d.tables:
            for row in t.rows:
                lines.append(" | ".join(c.text.strip() for c in row.cells))
        # group ~40 lines per "section" so citations point somewhere useful
        return [(f"section {i // 40 + 1}", "\n".join(lines[i:i + 40])) for i in range(0, len(lines), 40)]
    raw = Path(path).read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    return [("text", text)]


def split(pages: list[tuple[str, str]], size: int = 1200, overlap: int = 200) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for loc, text in pages:
        text = " ".join(text.split())
        if not text:
            continue
        start = 0
        while start < len(text):
            end = min(start + size, len(text))
            if end < len(text):  # prefer breaking on a sentence end
                cut = text.rfind(". ", start + size // 2, end)
                end = cut + 1 if cut != -1 else end
            out.append((loc, text[start:end].strip()))
            if end >= len(text):
                break
            start = max(end - overlap, start + 1)
    return out
