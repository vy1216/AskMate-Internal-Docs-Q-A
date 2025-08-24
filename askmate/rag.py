from __future__ import annotations
from typing import Dict, List

from askmate.config import AppConfig
from askmate.llm import generate_answer
from askmate.store import AskMateVectorStore


SYSTEM_PROMPT = (
    "You are AskMate, a precise and helpful AI knowledge buddy for teams. "
    "Prefer information from the provided context. Provide concise answers with bullet points when helpful. "
    "Cite sources by including their titles/links if provided in the context."
)


def build_user_prompt(query: str, context_chunks: List[Dict]) -> str:
    context_text = "\n\n".join([f"[Source {i+1}] {c['metadata'].get('source','')}\n{c['text']}" for i, c in enumerate(context_chunks)])
    return f"Question: {query}\n\nContext:\n{context_text}\n\nAnswer:"


def answer_question(query: str, vector_store: AskMateVectorStore, config: AppConfig, idk_mode: bool = True, top_k: int = 6, temperature: float = 0.2, channel: str = "web") -> Dict:
    # Retrieve
    context_chunks = vector_store.similarity_search(query, k=top_k)
    from_docs = len(context_chunks) > 0

    # Build prompt
    user_prompt = build_user_prompt(query, context_chunks)
    answer = generate_answer(SYSTEM_PROMPT, user_prompt, config, temperature)

    sources: List[str] = []
    for c in context_chunks:
        src = c["metadata"].get("source") or c["metadata"].get("title") or c["metadata"].get("url")
        if src and src not in sources:
            sources.append(src)

    # IDK mode: if no docs and short answer, flag missing
    if idk_mode and not from_docs:
        return {
            "answer": "I couldn't find this in your docs. Do you want me to flag this as a missing FAQ?",
            "sources": [],
            "from_docs": False,
            "suggest_flag": True,
        }

    return {
        "answer": answer,
        "sources": sources,
        "from_docs": from_docs,
        "suggest_flag": False,
    }