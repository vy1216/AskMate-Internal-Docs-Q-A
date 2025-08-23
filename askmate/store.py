from __future__ import annotations
from typing import Any, Dict, List
import os
import math

try:
    import chromadb  # type: ignore
except Exception:
    chromadb = None  # type: ignore

from askmate.config import AppConfig
from askmate.embeddings import EmbeddingsProvider, get_embeddings_provider


def cosine(a: List[float], b: List[float]) -> float:
    s = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return s / (na * nb)


class InMemoryCollection:
    def __init__(self):
        self._docs: List[Dict[str, Any]] = []

    def count(self) -> int:
        return len(self._docs)

    def add(self, ids: List[str], embeddings: List[List[float]], documents: List[str], metadatas: List[Dict[str, Any]]):
        for i, e, d, m in zip(ids, embeddings, documents, metadatas):
            self._docs.append({"id": i, "embedding": e, "text": d, "metadata": m})

    def query(self, query_embeddings: List[List[float]], n_results: int = 6, include: List[str] | None = None):
        q = query_embeddings[0]
        scored = [(cosine(q, d["embedding"]), d) for d in self._docs]
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:n_results]
        return {
            "ids": [[d["id"] for _, d in top]],
            "documents": [[d["text"] for _, d in top]],
            "metadatas": [[d["metadata"] for _, d in top]],
            "distances": [[1.0 - s for s, _ in top]],
        }


class AskMateVectorStore:
    def __init__(self, path: str, embeddings: EmbeddingsProvider):
        os.makedirs(path, exist_ok=True)
        self.embeddings = embeddings
        if chromadb is not None:
            try:
                self.client = chromadb.PersistentClient(path=path)
                self.collection = self.client.get_or_create_collection(name="askmate", metadata={"hnsw:space": "cosine"})
            except Exception:
                self.client = None
                self.collection = InMemoryCollection()
        else:
            self.client = None
            self.collection = InMemoryCollection()

    def add_texts(self, texts: List[str], metadatas: List[Dict[str, Any]], ids: List[str] | None = None) -> int:
        if not texts:
            return 0
        if ids is None:
            base = self.collection.count() if hasattr(self.collection, 'count') else 0
            ids = [f"doc-{base}-{i}" for i in range(len(texts))]
        vectors = self.embeddings.embed_texts(texts)
        self.collection.add(ids=ids, embeddings=vectors, documents=texts, metadatas=metadatas)
        return len(texts)

    def similarity_search(self, query: str, k: int = 6) -> List[Dict[str, Any]]:
        q = self.embeddings.embed_query(query)
        result = self.collection.query(query_embeddings=[q], n_results=k, include=["distances", "metadatas", "documents", "ids"])  # type: ignore
        docs: List[Dict[str, Any]] = []
        n = len(result.get("ids", [[]])[0])
        for i in range(n):
            docs.append({
                "id": result["ids"][0][i],
                "text": result["documents"][0][i],
                "metadata": result["metadatas"][0][i],
                "distance": (result.get("distances", [[None]])[0][i] if result.get("distances") else None),
            })
        return docs


def get_or_create_vector_store(config: AppConfig) -> AskMateVectorStore:
    embeddings = get_embeddings_provider(config)
    return AskMateVectorStore(config.vectorstore_dir, embeddings)