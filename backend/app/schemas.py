"""(한국어 요약) API 요청 바디(request body)의 Pydantic 스키마 정의.
- 개발자 모드 요청(DeveloperRequest)과 AI 요청(Explain/Translate)의 입력 구조와 검증 규칙을 담당
- 잘못된 입력은 FastAPI가 자동으로 422 응답을 내보냄 (main.py의 validation_error 핸들러가 포맷 통일)
"""
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from .services.color import HEX_RE

# 색각이상 유형은 이 세 가지만 허용 (Literal은 허용 값을 제한하는 타입)
CvdType = Literal["protan", "deutan", "tritan"]


class Element(BaseModel):
    """개발자 모드에서 분석할 HTML 요소 하나 (selector, 글자색, 배경색, 폰트 정보)."""
    selector: str = Field(max_length=300)                  # CSS 선택자 (예: ".btn-danger")
    text: str = Field(default="", max_length=500)         # 요소에 담긴 텍스트
    color: str                                            # 글자색 (#RRGGBB)
    background: str                                      # 배경색 (#RRGGBB)
    font_size_px: float | None = Field(default=None, ge=0, le=500)   # 폰트 크기(px) — 큰 텍스트 판정에 사용
    font_weight: int | None = Field(default=None, ge=100, le=1000)  # 폰트 굵기 — bold(700+) 판정에 사용

    @field_validator("color", "background")
    @classmethod
    def check_hex(cls, v: str) -> str:
        # HEX 형식(#RRGGBB 또는 RRGGBB)인지 검사하고, #이 없으면 붙여서 정규화
        if not HEX_RE.match(v):
            raise ValueError("color must be #RRGGBB")
        return v if v.startswith("#") else "#" + v


class DeveloperRequest(BaseModel):
    """POST /api/developer/analyze 요청 바디: 색약 유형 + 언어 + 분석할 요소 목록.
    user_id는 폼에 포함하지 않고 Authorization 헤더(세션 토큰)에서 추출한다."""
    cvd_type: CvdType
    lang: Literal["ko", "en"] = "ko"
    elements: list[Element] = Field(min_length=1, max_length=500)  # 최소 1개, 최대 500개


class ExplainRequest(BaseModel):
    """POST /api/ai/explain 요청 바디: 분석 결과를 AI가 설명하도록 요청."""
    lang: Literal["ko", "en"] = "ko"
    mode: Literal["user", "developer"] = "user"  # 사용자/개발자 모드 (설명 대상·톤이 달라짐)
    analysis: dict[str, Any]   # 이미지 분석 결과 전체 (이미지 데이터는 라우터에서 제거됨)


class TranslateRequest(BaseModel):
    """POST /api/ai/translate 요청 바디: 문장 목록을 대상 언어로 번역."""
    target_lang: Literal["ko", "en"]
    texts: list[str] = Field(min_length=1, max_length=50)  # 최대 50문장까지 한 번에 번역
