from __future__ import annotations
from typing import List
import os

from notion_client import Client  # type: ignore

from askmate.store import AskMateVectorStore
from askmate.ingestion.pdf import chunk_text


def ingest_notion_pages(database_id: str, vector_store: AskMateVectorStore) -> int:
    api_key = os.getenv("NOTION_API_KEY")
    if not api_key:
        return 0
    notion = Client(auth=api_key)
    results: List[dict] = []
    if database_id:
        query = notion.databases.query(database_id=database_id)
        results.extend(query.get("results", []))
    else:
        # Fetch recent pages as fallback
        results = notion.search(query="", page_size=10).get("results", [])

    total = 0
    for page in results:
        page_id = page.get("id")
        if not page_id:
            continue
        title = page.get("properties", {}).get("Name", {}).get("title", [])
        title_text = " ".join([t.get("plain_text", "") for t in title]) if isinstance(title, list) else str(title)
        # Pull blocks
        blocks = notion.blocks.children.list(page_id)
        texts: List[str] = []
        for b in blocks.get("results", []):
            rt = b.get(b.get("type", ""), {}).get("rich_text", [])
            txt = " ".join([t.get("plain_text", "") for t in rt]) if isinstance(rt, list) else ""
            if txt:
                texts.append(txt)
        combined = (title_text + "\n" + "\n".join(texts)).strip()
        chunks = chunk_text(combined)
        metas = [{"source": f"Notion:{title_text}", "type": "notion"} for _ in chunks]
        total += vector_store.add_texts(chunks, metas)
    return total