"""Optional Claude API client. AI only explains/translates; it never computes values.

If ANTHROPIC_API_KEY is empty or the call fails, callers fall back to template text.
"""
import json

import httpx

from ..config import settings

API_URL = "https://api.anthropic.com/v1/messages"
TIMEOUT = 20.0


async def ask_json(system: str, user: str, max_tokens: int = 1500) -> dict | None:
    if not settings.ai_enabled:
        return None
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": settings.anthropic_model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    for _ in range(2):  # one retry on parse failure
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.post(API_URL, headers=headers, json=body)
                r.raise_for_status()
                text = "".join(b.get("text", "") for b in r.json().get("content", []))
                text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(text)
        except (httpx.HTTPError, json.JSONDecodeError, ValueError):
            continue
    return None
