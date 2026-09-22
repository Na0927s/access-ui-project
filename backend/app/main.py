"""Access Ui backend — stateless, no database, no user management."""
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routers import ai, analysis, developer

app = FastAPI(title="Access Ui API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "ERROR", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=detail)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, __: RequestValidationError):
    return JSONResponse(status_code=422, content={"code": "INVALID_REQUEST", "message": "입력값을 확인해주세요."})


@app.get("/api/health")
def health():
    return {"status": "ok", "ai_enabled": settings.ai_enabled}


app.include_router(analysis.router)
app.include_router(developer.router)
app.include_router(ai.router)
