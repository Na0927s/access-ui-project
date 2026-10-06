"""Optional Claude API client. AI only explains/translates; it never computes values.

If ANTHROPIC_API_KEY is empty or the call fails, callers fall back to template text.

(한국어 요약) Claude API 호출 클라이언트 — 프로젝트 규칙 4번(AI 역할 분리)의 담당.
- AI는 "설명/번역"만 하고 수치 계산·판정은 절대 하지 않음 (각 라우터의 시스템 프롬프트로 강제)
- 키가 없거나 호출이 실패하면 None을 반환 → 각 라우터가 미리 정의된 템플릿 문구로 대체
- 즉, 이 모듈/AI 키가 없어도 핵심 분석 기능은 정상 동작함
"""
import json

import httpx

from ..config import settings

API_URL = "https://api.anthropic.com/v1/messages"  # Anthropic Messages API 엔드포인트
TIMEOUT = 20.0  # 요청 제한 시간 (초) — 사용자를 오래 기다리게 하지 않기 위함


async def ask_json(system: str, user: str, max_tokens: int = 1500) -> dict | None:
    """(한국어) Claude에게 system 프롬프트와 사용자 입력을 보내 JSON 응답을 받아오는 함수.
    성공하면 파싱된 dict, 실패하면 None을 반환 (호출자가 fallback 처리하도록 설계)."""
    if not settings.ai_enabled:
        return None  # API 키가 없으면 호출 자체를 생략
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": settings.anthropic_model,
        "max_tokens": max_tokens,
        "system": system,                                     # AI의 역할/제약을 정하는 지시문
        "messages": [{"role": "user", "content": user}],      # 실제 요청 내용 (JSON 문자열)
    }
    for _ in range(2):  # one retry on parse failure (파싱 실패 시 1회 재시도)
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.post(API_URL, headers=headers, json=body)
                r.raise_for_status()  # HTTP 오류(401, 429, 500 등)면 예외 발생
                # 응답에서 텍스트 부분만 추출 (Claude 응답은 content 블록 배열로 구성됨)
                text = "".join(b.get("text", "") for b in r.json().get("content", []))
                # 마크다운 코드 펜스(```json ...)로 감싸서 오는 경우를 대비해 제거
                text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(text)
        except (httpx.HTTPError, json.JSONDecodeError, ValueError):
            continue  # 네트워크 오류나 JSON 파싱 실패면 재시도
    return None  # 재시도까지 실패 → None 반환, 호출자는 템플릿 문구로 대체
