"""(한국어 요약) 개발자 모드 코드 분석 API 라우터 — POST /api/developer/analyze.
- 프론트엔드에서 색출한 HTML 요소 목록(selector, 글자색, 배경색, 폰트 정보)을 JSON으로 받아
- analyzer.analyze_elements()로 요소별 대비 검사 + 문제 해결 카드를 생성해 반환
- 로그인 사용자(토큰 전달 시)의 분석 결과는 DB에 저장 (규칙 1번)
- 코드 분석은 이미지가 없으므로 캐시는 적용하지 않음 (이미지 해시 기반이 아니므로)
"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import api_error
from ..routers.auth import current_user_id
from ..schemas import DeveloperRequest
from ..services.analyzer import analyze_elements
from ..services.persistence import save_result

router = APIRouter(prefix="/api/developer", tags=["developer"])


@router.post("/analyze")
def analyze_code(
    req: DeveloperRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    # 토큰이 있으면 로그인 사용자 식별 (결과 저장용). 없으면 비로그인(저장 안 함).
    # 토큰 검증은 try 블록 밖에서 수행해야 만료/무효 토큰이 401로 올바르게 응답됨.
    # try 안에서 호출하면 current_user_id가 던지는 401 HTTPException이 broad except에 잡혀
    # ANALYSIS_FAILED(500)로 둔갑하는 버그가 생김 (analysis.py와 동일한 패턴).
    user_id = current_user_id(authorization) if authorization else None

    try:
        # Pydantic 모델을 dict로 변환해 분석 파이프라인에 전달
        result = analyze_elements([e.model_dump() for e in req.elements], req.cvd_type, req.lang)
        # 로그인 사용자면 히스토리에 저장 (코드 모드는 input_meta를 고정 문구로)
        if user_id is not None:
            save_result(
                db, user_id, "developer-code", req.cvd_type, result,
                input_meta="HTML/CSS 코드",
            )
        return result
    except Exception as e:
        raise api_error("ANALYSIS_FAILED") from e  # 내부 오류 상세는 노출하지 않음
