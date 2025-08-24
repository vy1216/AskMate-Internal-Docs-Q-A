import os
from dataclasses import dataclass


@dataclass
class AppConfig:
    openai_api_key: str | None
    gemini_api_key: str | None
    embedding_provider: str
    llm_provider: str
    vectorstore_dir: str
    database_url: str
    openai_embedding_model: str
    openai_chat_model: str
    gemini_embedding_model: str
    gemini_chat_model: str

    @staticmethod
    def from_env() -> "AppConfig":
        openai_api_key = os.getenv("OPENAI_API_KEY")
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        embedding_provider = os.getenv("EMBEDDING_PROVIDER", "openai").lower()
        llm_provider = os.getenv("LLM_PROVIDER", ("openai" if openai_api_key else ("gemini" if gemini_api_key else "openai"))).lower()
        vectorstore_dir = os.getenv("VECTORSTORE_DIR", "./storage/chroma")
        database_url = os.getenv("DATABASE_URL", "sqlite:///./storage/askmate.db")
        return AppConfig(
            openai_api_key=openai_api_key,
            gemini_api_key=gemini_api_key,
            embedding_provider=embedding_provider,
            llm_provider=llm_provider,
            vectorstore_dir=vectorstore_dir,
            database_url=database_url,
            openai_embedding_model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
            openai_chat_model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            gemini_embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004"),
            gemini_chat_model=os.getenv("GEMINI_CHAT_MODEL", "gemini-1.5-flash"),
        )