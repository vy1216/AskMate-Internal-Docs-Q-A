from __future__ import annotations
import io
from typing import Optional


def transcribe_with_openai(audio_bytes: bytes) -> Optional[str]:
    try:
        from openai import OpenAI  # type: ignore
        client = OpenAI()
        # The streamlit mic component provides webm/ogg; OpenAI Whisper expects bytes-like file
        # We'll send as an in-memory file
        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = "audio.webm"
        transcript = client.audio.transcriptions.create(model="whisper-1", file=file_obj)  # type: ignore
        return getattr(transcript, "text", None)
    except Exception:
        return None