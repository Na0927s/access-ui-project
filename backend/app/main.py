"""ColorLens backend — analysis API with SQLite persistence for logged-in users.

(한국어 요약) FastAPI 애플리케이션의 진입점(entrypoint) 파일.
- 비로그인 분석은 메모리만, 로그인 사용자의 결과·계정은 SQLite DB에 영속화 (규칙 1)
- 회원 관리 API(회원가입/로그인/내정보/히스토리) 제공 (규칙 2)
- 업로드 이미지 바이트는 항상 메모리만 (규칙 3)
- CORS 설정, 공통 에러 처리, 헬스체크 엔드포인트, 라우터 등록을 담당
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .models import AnalysisCache
from .routers import ai, analysis, auth, developer

# FastAPI 애플리케이션 인스턴스 생성 (title/version은 /docs 자동 문서에 표시됨)
app = FastAPI(title="ColorLens API", version="0.1.0")

# 앱 시작 시 테이블 자동 생성 (개발용). 이미 존재하면 건드리지 않음.
# (한국어) 운영 환경에서는 Alembic 같은 마이그레이션 도구를 쓰는 것이 권장되지만,
# 학교 프로젝트에서는 create_all()로 충분.
#
# 스키마 변경 호환: 기존 analysis_cache 테이블에 lang 컬럼이 없으면(=구 스키마) 캐시
# 테이블만 drop 후 재생성한다. 캐시는 속도 향상용 휘발 데이터라 손실 OK이며,
# 계정(users)·히스토리(analysis_results)는 별개 테이블이라 보존된다.
from sqlalchemy import inspect as sa_inspect

_insp = sa_inspect(engine)
if _insp.has_table("analysis_cache"):
    _cols = {c["name"] for c in _insp.get_columns("analysis_cache")}
    if "lang" not in _cols:
        AnalysisCache.__table__.drop(engine)
Base.metadata.create_all(bind=engine)

# CORS: 프론트엔드(기본 http://localhost:5176)가 다른 포트에서 백엔드를 호출할 수 있게 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,      # .env의 ALLOWED_ORIGINS에서 가져온 허용 목록
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # 회원 관리 API를 위해 PUT/DELETE 추가
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


# 각 기능별 라우터 등록 (analysis=이미지 분석, developer=코드 분석, ai=AI 설명·번역, auth=회원 관리)
app.include_router(analysis.router)
app.include_router(developer.router)
app.include_router(ai.router)
app.include_router(auth.router)


# --- 배포용 정적 파일 서빙 (Render 등에서 프론트와 백을 한 서버로 서빙) ---
# 개발 모드(static_dir 빈 문자열)에서는 활성화되지 않음.
# (한국어) 배포 시 STATIC_DIR 환경변수에 빌드된 프론트 디렉터리 경로를 지정하면,
# 백엔드가 /api/* 외의 모든 요청에 프론트 정적 파일(index.html)을 반환하도록 동작.
if settings.static_dir:
    import os
    from pathlib import Path

    static_path = Path(settings.static_dir)
    if static_path.is_dir():
        # /assets 등 정적 자원 서빙
        app.mount("/assets", StaticFiles(directory=static_path / "assets"), name="assets")

        # SPA fallback: /api/* 가 아닌 모든 경로는 index.html로 (React Router용)
        @app.get("/{full_path:path}")
        async def spa_fallback(full_path: str):
            # /api/ 경로는 이미 위 라우터들이 처리하므로, 여기로 오면 안 됨 (404)
            if full_path.startswith("api/"):
                raise HTTPException(404, {"code": "NOT_FOUND", "message": "요청한 API를 찾을 수 없습니다."})
            index = static_path / "index.html"
            if index.is_file():
                return FileResponse(index)
            raise HTTPException(404, {"code": "NOT_FOUND", "message": "정적 파일을 찾을 수 없습니다."})
