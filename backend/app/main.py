"""Access Ui backend — stateless, no database, no user management.

(한국어 요약) FastAPI 애플리케이션의 진입점(entrypoint) 파일.
- 상태를 저장하지 않고(stateless), DB도 회원 관리 기능도 없음 (프로젝트 규칙 1, 2번)
- CORS 설정, 공통 에러 처리, 헬스체크 엔드포인트, 라우터 등록을 담당
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routers import ai, analysis, developer

# FastAPI 애플리케이션 인스턴스 생성 (title/version은 /docs 자동 문서에 표시됨)
app = FastAPI(title="Access Ui API", version="0.1.0")

# CORS: 프론트엔드(기본 http://localhost:5176)가 다른 포트에서 백엔드를 호출할 수 있게 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,      # .env의 ALLOWED_ORIGINS에서 가져온 허용 목록
    allow_methods=["GET", "POST"],       # 읽기/쓰기 외의 메서드는 불필요
    allow_headers=["*"],
)


# 공통 에러 응답 포맷: 모든 오류를 {"code": ..., "message": ...} 형태로 통일
@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    # detail이 dict(우리 서비스 에러)면 그대로, 문자열이면 기본 포맷으로 감싸기
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "ERROR", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=detail)


# 요청 검증 실패(422): Pydantic 스키마를 통과하지 못한 요청도 같은 포맷으로 응답
@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, __: RequestValidationError):
    return JSONResponse(status_code=422, content={"code": "INVALID_REQUEST", "message": "입력값을 확인해주세요."})


# 헬스체크: 서버 살아있는지 + AI API 키가 설정되어 있는지 함께 알려줌
@app.get("/api/health")
def health():
    return {"status": "ok", "ai_enabled": settings.ai_enabled}


# 각 기능별 라우터 등록 (analysis=이미지 분석, developer=코드 분석, ai=AI 설명·번역)
app.include_router(analysis.router)
app.include_router(developer.router)
app.include_router(ai.router)
