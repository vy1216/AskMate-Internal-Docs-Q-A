from __future__ import annotations
from typing import List
import hashlib
import math

from askmate.config import AppConfig


class EmbeddingsProvider:
    def __init__(self, config: AppConfig):
        self.config = config
        self._init_clients()

    def _init_clients(self) -> None:
        self._openai_client = None
        self._gemini = None
        if self.config.openai_api_key:
            try:
                from openai import OpenAI  # type: ignore
                self._openai_client = OpenAI(api_key=self.config.openai_api_key)
            except Exception:
                self._openai_client = None
        if self.config.gemini_api_key:
            try:
                import google.generativeai as genai  # type: ignore
                genai.configure(api_key=self.config.gemini_api_key)
                self._gemini = genai
            except Exception:
                self._gemini = None

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        provider = self.config.embedding_provider
        if provider == "openai" and self._openai_client:
            return self._embed_openai(texts)
        if provider == "gemini" and self._gemini:
            return self._embed_gemini(texts)
        return self._embed_hash(texts)

    def embed_query(self, text: str) -> List[float]:
        return self.embed_texts([text])[0]

    # Providers
    def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        assert self._openai_client is not None
        model = self.config.openai_embedding_model
        resp = self._openai_client.embeddings.create(model=model, input=texts)
        return [d.embedding for d in resp.data]

    def _embed_gemini(self, texts: List[str]) -> List[List[float]]:
        assert self._gemini is not None
        model = self.config.gemini_embedding_model
        embeddings: List[List[float]] = []
        for t in texts:
            r = self._gemini.embed_content(model=model, content=t)
            embeddings.append(r["embedding"]["values"])  # type: ignore
        return embeddings

    def _embed_hash(self, texts: List[str], dim: int = 512) -> List[List[float]]:
        # Simple, dependency-free feature hashing over tokens
        out: List[List[float]] = []
        for t in texts:
            vec = [0.0] * dim
            for tok in t.lower().split():
                h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
                idx = h % dim
                sign = -1.0 if (h >> 1) & 1 else 1.0
                vec[idx] += sign
            # L2 normalize
            norm = math.sqrt(sum(v * v for v in vec)) or 1.0
            out.append([v / norm for v in vec])
        return out


def get_embeddings_provider(config: AppConfig) -> EmbeddingsProvider:
    return EmbeddingsProvider(config)