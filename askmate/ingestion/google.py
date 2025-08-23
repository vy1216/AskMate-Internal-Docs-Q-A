from __future__ import annotations
from typing import List
import os

from google.oauth2.credentials import Credentials  # type: ignore
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
from googleapiclient.discovery import build  # type: ignore
from google.auth.transport.requests import Request  # type: ignore

from askmate.store import AskMateVectorStore
from askmate.ingestion.pdf import chunk_text

SCOPES = [
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


def _get_creds() -> Credentials | None:
    secret_file = os.getenv("GOOGLE_CLIENT_SECRET_FILE")
    if not secret_file or not os.path.exists(secret_file):
        return None
    creds = None
    token_path = os.path.join(os.path.dirname(secret_file), "token.json")
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())  # type: ignore
            except Exception:
                creds = None
        if not creds:
            flow = InstalledAppFlow.from_client_secrets_file(secret_file, SCOPES)
            creds = flow.run_local_server(port=0)
            with open(token_path, "w") as token:
                token.write(creds.to_json())
    return creds


def ingest_google_docs(file_ids: List[str], vector_store: AskMateVectorStore) -> int:
    creds = _get_creds()
    if not creds:
        return 0
    docs_service = build("docs", "v1", credentials=creds)

    total = 0
    for fid in file_ids:
        doc = docs_service.documents().get(documentId=fid).execute()
        title = doc.get("title", fid)
        content_elems = doc.get("body", {}).get("content", [])
        texts: List[str] = []
        for e in content_elems:
            p = e.get("paragraph")
            if not p:
                continue
            pieces = p.get("elements", [])
            for pe in pieces:
                txt = pe.get("textRun", {}).get("content")
                if txt:
                    texts.append(txt)
        combined = (title + "\n" + "".join(texts)).strip()
        chunks = chunk_text(combined)
        metas = [{"source": f"GoogleDoc:{title}", "type": "google_doc"} for _ in chunks]
        total += vector_store.add_texts(chunks, metas)
    return total