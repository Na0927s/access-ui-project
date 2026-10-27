"""(한국어 요약) 이미지 분석 API 라우터 — POST /api/analysis/image.
- 프론트엔드가 보낸 이미지 파일(multipart) + 색약 유형 + 모드 + 언어를 받아 검증하고
- analyzer.analyze_image() 파이프라인을 실행해 결과를 JSON으로 반환
- 업로드 이미지는 메모리(BytesIO)로만 처리하고 디스크에 저장하지 않음 (규칙 3번)
- 로그인 사용자(user_id 전달 시)의 분석 결과는 DB에 저장 (규칙 1번 — 비로그인은 저장 안 함)
- 같은 이미지(해시)+색약 유형이면 캐시로 재분석 생략 (속도 향상)
"""
from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..errors import api_error
from ..services.analyzer import analyze_image, load_image
from ..services.persistence import get_cached, image_hash, save_result, set_cached
from ..routers.auth import current_user_id

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/image")
async def analyze_image_endpoint(
    file: UploadFile = File(...),          # 업로드된 이미지 파일
    cvd_type: str = Form(...),             # 색약 유형: protan / deutan / tritan
    mode: str = Form("user"),              # 사용자 모드("user") 또는 개발자 모드("developer")
    lang: str = Form("ko"),                # 응답 언어: ko / en
    authorization: str | None = Header(default=None),  # 로그인 토큰 (없으면 비로그인)
    db: Session = Depends(get_db),
):
    # --- 입력값 검증: 허용된 값이 아닌 요청은 즉시 에러 응답 ---
    if cvd_type not in ("protan", "deutan", "tritan"):
        raise api_error("INVALID_CVD_TYPE")
    if mode not in ("user", "developer"):
        raise api_error("INVALID_MODE")
    if lang not in ("ko", "en"):
        raise api_error("INVALID_LANG")
    if file.content_type not in config.ALLOWED_CONTENT_TYPES:
        raise api_error("UNSUPPORTED_FORMAT")

    # 토큰이 있으면 로그인 사용자 식별 (결과 저장용). 없으면 비로그인(저장 안 함).
    # 토큰이 유효하지 않은 경우엔 비로그인으로 처리하지 않고 401을 내야 사용자가 인지할 수 있다.
    user_id = current_user_id(authorization) if authorization else None

    # Read into memory only; the image is never written to disk.
    # (한국어) 이미지를 메모리로만 읽기 — 10MB+1바이트까지만 읽어 크기 초과 여부를 확인
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise api_error("FILE_TOO_LARGE")

    # 캐시 조회: 같은 이미지 해시 + 색약 유형 + 모드가 있으면 재분석 없이 반환
    # (한국어) 캐시는 로그인 여부와 무관하게 속도 향상 목적으로 적용
    img_hash = image_hash(data)
    cached = get_cached(db, img_hash, cvd_type, mode)
    if cached is not None:
        # 캐시 적중 시에도, 로그인 사용자면 히스토리에 기록 (사용자가 같은 이미지를
        # 여러 번 검사한 이력을 보존하기 위함)
        if user_id is not None:
            save_result(db, user_id, mode, cvd_type, cached, input_meta=file.filename)
        return cached

    try:
        img = load_image(data)             # 형식 검증 + 메모리상 이미지 객체 생성
    except ValueError as e:                # 허용되지 않는 포맷
        raise api_error("UNSUPPORTED_FORMAT") from e
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise api_error("INVALID_IMAGE") from e   # 깨졌거나 열 수 없는 파일

    try:
        result = analyze_image(img, cvd_type, mode, lang)  # 분석 파이프라인 실행
        # 캐시 저장 (비로그인 포함 — 다음 분석 속도 향상)
        set_cached(db, img_hash, cvd_type, mode, result)
        # 로그인 사용자면 히스토리에도 저장 (규칙 1: 비로그인은 저장 안 함)
        if user_id is not None:
            save_result(db, user_id, mode, cvd_type, result, input_meta=file.filename)
        return result
    except Exception as e:  # never leak internals
        raise api_error("ANALYSIS_FAILED") from e      # 내부 오류는 사용자에게 상세 노출하지 않음
    finally:
        # Release the in-memory image bytes immediately (규칙 3 — 이미지 비저장).
        # `img` may be unbound if load_image() raised above; guard with locals() check.
        if "img" in locals():
            del img
        del data
