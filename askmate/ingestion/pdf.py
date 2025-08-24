from __future__ import annotations
from typing import List

import io
from pypdf import PdfReader  # type: ignore

from askmate.store import AskMateVectorStore


def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 120) -> List[str]:
    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunks.append(text[start:end])
        start = end - chunk_overlap
        if start < 0:
            start = 0
    return [c.strip() for c in chunks if c.strip()]


def extract_text_from_pdf(file) -> str:
    data = file.read()
    reader = PdfReader(io.BytesIO(data))
    pages = []
    for p in reader.pages:
        pages.append(p.extract_text() or "")
    return "\n".join(pages)


def ingest_pdf(uploaded_file, vector_store: AskMateVectorStore) -> int:
    content = extract_text_from_pdf(uploaded_file)
    chunks = chunk_text(content)
    metas = [{"source": uploaded_file.name, "type": "pdf"} for _ in chunks]
    return vector_store.add_texts(chunks, metas)