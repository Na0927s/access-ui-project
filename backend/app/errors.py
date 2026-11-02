"""(한국어 요약) 서비스에서 공통으로 쓰는 에러 정의.
- 에러 코드 → (HTTP 상태 코드, 사용자 안내 메시지) 매핑을 모아둔 파일
- api_error()로 HTTPException을 만들면 main.py의 핸들러가 {"code", "message"} 포맷으로 응답
"""
from fastapi import HTTPException

# 에러 코드별 (HTTP 상태 코드, 한국어 안내 메시지)
MESSAGES = {
    "UNSUPPORTED_FORMAT": (400, "지원하지 않는 파일 형식입니다. PNG, JPG, JPEG 파일만 업로드할 수 있습니다."),
    "FILE_TOO_LARGE": (413, "파일 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드해주세요."),
    "INVALID_IMAGE": (400, "이미지를 불러오지 못했습니다. 다른 파일로 다시 시도해주세요."),
    "INVALID_CVD_TYPE": (422, "색각이상 유형을 선택해주세요."),
    "INVALID_MODE": (422, "모드 정보가 올바르지 않습니다."),
    "INVALID_LANG": (422, "언어 정보가 올바르지 않습니다."),
    "ANALYSIS_FAILED": (500, "분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."),
    "UNAUTHORIZED": (401, "로그인이 필요합니다."),
}


def api_error(code: str) -> HTTPException:
    # 에러 코드로 HTTPException 생성 — raise하면 공통 핸들러가 JSON으로 변환해 응답함
    status, message = MESSAGES[code]
    return HTTPException(status_code=status, detail={"code": code, "message": message})
