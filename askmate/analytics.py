from __future__ import annotations
from typing import List, Tuple
from datetime import datetime, timedelta

from sqlalchemy import create_engine, text


class AnalyticsClient:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url, future=True)
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with self.engine.begin() as conn:
            conn.execute(text(
                """
                CREATE TABLE IF NOT EXISTS queries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    question TEXT NOT NULL,
                    has_answer INTEGER NOT NULL,
                    sources TEXT,
                    channel TEXT,
                    created_at TIMESTAMP NOT NULL
                );
                """
            ))

    def log_query(self, question: str, has_answer: bool, sources: List[str], channel: str) -> None:
        srcs = ",".join(sources)
        with self.engine.begin() as conn:
            conn.execute(text(
                "INSERT INTO queries (question, has_answer, sources, channel, created_at) VALUES (:q, :a, :s, :c, :t)"
            ), {"q": question, "a": 1 if has_answer else 0, "s": srcs, "c": channel, "t": datetime.utcnow()})

    def count_queries(self) -> int:
        with self.engine.connect() as conn:
            r = conn.execute(text("SELECT COUNT(*) FROM queries"))
            return int(r.scalar() or 0)

    def count_answered(self) -> int:
        with self.engine.connect() as conn:
            r = conn.execute(text("SELECT COUNT(*) FROM queries WHERE has_answer=1"))
            return int(r.scalar() or 0)

    def count_unanswered(self) -> int:
        with self.engine.connect() as conn:
            r = conn.execute(text("SELECT COUNT(*) FROM queries WHERE has_answer=0"))
            return int(r.scalar() or 0)

    def top_questions(self, days: int = 7, limit: int = 5) -> List[Tuple[str, int]]:
        since = datetime.utcnow() - timedelta(days=days)
        with self.engine.connect() as conn:
            r = conn.execute(text(
                "SELECT question, COUNT(*) as n FROM queries WHERE created_at>=:since GROUP BY question ORDER BY n DESC LIMIT :limit"
            ), {"since": since, "limit": limit})
            return [(row[0], int(row[1])) for row in r.fetchall()]

    def top_sources(self, days: int = 7, limit: int = 5) -> List[Tuple[str, int]]:
        since = datetime.utcnow() - timedelta(days=days)
        with self.engine.connect() as conn:
            r = conn.execute(text(
                "SELECT sources FROM queries WHERE created_at>=:since AND sources IS NOT NULL AND sources!=''"
            ), {"since": since})
            counts = {}
            for (srcs,) in r.fetchall():
                for s in (srcs or "").split(","):
                    s = s.strip()
                    if not s:
                        continue
                    counts[s] = counts.get(s, 0) + 1
            items = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            return [(k, v) for k, v in items]

    def unanswered(self, days: int = 30, limit: int = 10) -> List[Tuple[str, int]]:
        since = datetime.utcnow() - timedelta(days=days)
        with self.engine.connect() as conn:
            r = conn.execute(text(
                "SELECT question, COUNT(*) as n FROM queries WHERE created_at>=:since AND has_answer=0 GROUP BY question ORDER BY n DESC LIMIT :limit"
            ), {"since": since, "limit": limit})
            return [(row[0], int(row[1])) for row in r.fetchall()]