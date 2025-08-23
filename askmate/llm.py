from __future__ import annotations
from typing import List, Dict

from askmate.config import AppConfig


def generate_answer(system_prompt: str, user_prompt: str, config: AppConfig, temperature: float = 0.2) -> str:
    provider = config.llm_provider
    if provider == "openai" and config.openai_api_key:
        try:
            from openai import OpenAI  # type: ignore
            client = OpenAI(api_key=config.openai_api_key)
            resp = client.chat.completions.create(
                model=config.openai_chat_model,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return resp.choices[0].message.content or ""
        except Exception:
            pass
    if provider == "gemini" and config.gemini_api_key:
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=config.gemini_api_key)
            model = genai.GenerativeModel(config.gemini_chat_model)
            resp = model.generate_content([
                {"role": "user", "parts": [system_prompt + "\n\n" + user_prompt]},
            ], generation_config={"temperature": temperature})
            return resp.text or ""
        except Exception:
            pass
    # Very last resort: simple echo fallback
    return "I'm unable to access a language model right now. Please configure API keys."