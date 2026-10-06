"""(한국어 요약) 개발자 모드 코드 분석 API 라우터 — POST /api/developer/analyze.
- 프론트엔드에서 색출한 HTML 요소 목록(selector, 글자색, 배경색, 폰트 정보)을 JSON으로 받아
- analyzer.analyze_elements()로 요소별 대비 검사 + 문제 해결 카드를 생성해 반환
"""
from fastapi import APIRouter

from ..errors import api_error
from ..schemas import DeveloperRequest
from ..services.analyzer import analyze_elements

router = APIRouter(prefix="/api/developer", tags=["developer"])


@router.post("/analyze")
def analyze_code(req: DeveloperRequest):
    try:
        # Pydantic 모델을 dict로 변환해 분석 파이프라인에 전달
        return analyze_elements([e.model_dump() for e in req.elements], req.cvd_type, req.lang)
    except Exception as e:
        raise api_error("ANALYSIS_FAILED") from e  # 내부 오류 상세는 노출하지 않음
