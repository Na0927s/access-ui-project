import json

from fastapi import APIRouter

from ..schemas import ExplainRequest, TranslateRequest
from ..services.ai_client import ask_json

router = APIRouter(prefix="/api/ai", tags=["ai"])

EXPLAIN_SYSTEM = (
    "You explain web color-accessibility analysis results to {audience}. "
    "Never change, recompute or invent numbers, colors or verdicts; only explain the given data. "
    "Use hedged wording ('may be hard to distinguish'). Answer in {lang}. "
    'Return JSON only: {{"summary": str, "issues": [{{"id": int, "explanation": str}}]}}'
)


def _fallback_explain(analysis: dict) -> dict:
    issues = analysis.get("issues", [])
    if issues:
        summary = f"{len(issues)}개의 접근성 문제가 발견되었습니다. 아래 추천 색상과 비색상 개선 방법을 확인해보세요."
    else:
        summary = "발견된 주요 접근성 문제가 없습니다."
    return {
        "source": "fallback",
        "summary": summary,
        "issues": [{"id": i["id"], "explanation": i["message"]} for i in issues],
    }


@router.post("/explain")
async def explain(req: ExplainRequest):
    # Send only the analysis data, never the image itself.
    data = {k: v for k, v in req.analysis.items() if k != "simulated_image"}
    system = EXPLAIN_SYSTEM.format(
        audience="designers and students" if req.mode == "user" else "front-end developers",
        lang="Korean" if req.lang == "ko" else "English",
    )
    out = await ask_json(system, json.dumps(data, ensure_ascii=False))
    if not out or "summary" not in out:
        return _fallback_explain(data)
    return {"source": "ai", "summary": out["summary"], "issues": out.get("issues", [])}


@router.post("/translate")
async def translate(req: TranslateRequest):
    lang = "English" if req.target_lang == "en" else "Korean"
    system = (
        f"Translate each string into {lang}. Keep hex colors, numbers and ratios exactly. "
        'Return JSON only: {"texts": [str, ...]} with the same length and order.'
    )
    out = await ask_json(system, json.dumps(req.texts, ensure_ascii=False))
    texts = out.get("texts") if out else None
    if not isinstance(texts, list) or len(texts) != len(req.texts):
        return {"source": "fallback", "texts": req.texts}
    return {"source": "ai", "texts": texts}
