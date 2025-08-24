from __future__ import annotations
from typing import List

from askmate.store import AskMateVectorStore
from askmate.analytics import AnalyticsClient
from askmate.config import AppConfig


SEED_SUGGESTIONS = {
    "leave": ["What is our leave policy?", "Maternity leave policy?", "Sick leave process?"],
    "policy": ["Refund policy?", "Security policy?", "Data retention policy?"],
    "expense": ["Expense reimbursement?", "Allowed categories?", "Receipt requirements?"],
}


def suggest_related_questions(query: str, vector_store: AskMateVectorStore, analytics: AnalyticsClient, config: AppConfig, limit: int = 4) -> List[str]:
    ql = query.lower()
    suggestions: List[str] = []
    for k, vals in SEED_SUGGESTIONS.items():
        if k in ql:
            suggestions.extend(vals)
    # Add top unanswered
    for q, _ in analytics.unanswered(days=30, limit=3):
        if q not in suggestions and q.lower() != ql:
            suggestions.append(q)
    # Trim and unique
    seen = set()
    out: List[str] = []
    for s in suggestions:
        if s not in seen:
            seen.add(s)
            out.append(s)
        if len(out) >= limit:
            break
    return out