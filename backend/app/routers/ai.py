"""(한국어 요약) AI 부가 기능 API 라우터 — /api/ai/explain, /api/ai/translate.
- AI는 "결과 설명"과 "번역"만 담당 (수치 계산·판정 변경 금지 — 규칙 4번)
- AI 키가 없거나 호출에 실패하면 미리 정의된 템플릿 문구(fallback)로 응답
"""
import json

from fastapi import APIRouter

from ..schemas import ExplainRequest, TranslateRequest
from ..services import texts
from ..services.ai_client import ask_json

router = APIRouter(prefix="/api/ai", tags=["ai"])

# 설명 요청의 시스템 프롬프트:
# - 숫자·색상·판정을 절대 바꾸거나 새로 만들지 말 것 (설명만)
# - 단정 대신 "~할 수 있습니다" 같은 완화된 표현 사용
# - 반드시 JSON 형식으로만 응답하도록 강제
EXPLAIN_SYSTEM = (
    "You explain web color-accessibility analysis results to {audience}. "
    "Never change, recompute or invent numbers, colors or verdicts; only explain the given data. "
    "Use hedged wording ('may be hard to distinguish'). Answer in {lang}. "
    'Return JSON only: {{"summary": str, "issues": [{{"id": int, "explanation": str}}]}}'
)


def _fallback_explain(analysis: dict, lang: str) -> dict:
    # AI 없이 쓰는 기본 설명: 이슈 개수만 세어 템플릿 문구로 요약 생성
    issues = analysis.get("issues", [])
    if issues:
        summary = texts.FALLBACK_EXPLAIN["issues"][lang].format(count=len(issues))
    else:
        summary = texts.FALLBACK_EXPLAIN["no_issues"][lang]
    return {
        "source": "fallback",
        "summary": summary,
        "issues": [{"id": i["id"], "explanation": i["message"]} for i in issues],
    }


@router.post("/explain")
async def explain(req: ExplainRequest):
    # Send only the analysis data, never the image itself.
    # (한국어) base64 시뮬레이션 이미지는 용량만 크므로 제외하고 텍스트 데이터만 AI에게 전송
    data = {k: v for k, v in req.analysis.items() if k != "simulated_image"}
    # 모드에 따라 설명 대상(일반 사용자 vs 프론트엔드 개발자)과 언어를 프롬프트에 반영
    system = EXPLAIN_SYSTEM.format(
        audience="designers and students" if req.mode == "user" else "front-end developers",
        lang="Korean" if req.lang == "ko" else "English",
    )
    out = await ask_json(system, json.dumps(data, ensure_ascii=False))
    if not out or "summary" not in out:
        return _fallback_explain(data, req.lang)   # AI 실패 → 템플릿 설명으로 대체
    return {"source": "ai", "summary": out["summary"], "issues": out.get("issues", [])}


@router.post("/translate")
async def translate(req: TranslateRequest):
    lang = "English" if req.target_lang == "en" else "Korean"
    # 번역 프롬프트: HEX 색상 코드·숫자·비율은 절대 바꾸지 말 것, 순서와 개수 유지
    system = (
        f"Translate each string into {lang}. Keep hex colors, numbers and ratios exactly. "
        'Return JSON only: {"texts": [str, ...]} with the same length and order.'
    )
    out = await ask_json(system, json.dumps(req.texts, ensure_ascii=False))
    texts = out.get("texts") if out else None
    # 번역 결과가 리스트가 아니거나 개수가 맞지 않으면 원문 그대로 반환 (fallback)
    if not isinstance(texts, list) or len(texts) != len(req.texts):
        return {"source": "fallback", "texts": req.texts}
    return {"source": "ai", "texts": texts}
