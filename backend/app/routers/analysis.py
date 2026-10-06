"""(한국어 요약) 이미지 분석 API 라우터 — POST /api/analysis/image.
- 프론트엔드가 보낸 이미지 파일(multipart) + 색약 유형 + 모드 + 언어를 받아 검증하고
- analyzer.analyze_image() 파이프라인을 실행해 결과를 JSON으로 반환
- 업로드 이미지는 메모리(BytesIO)로만 처리하고 디스크에 저장하지 않음 (규칙 3번)
"""
from fastapi import APIRouter, File, Form, UploadFile
from PIL import Image, UnidentifiedImageError

from .. import config
from ..errors import api_error
from ..services.analyzer import analyze_image, load_image

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/image")
async def analyze_image_endpoint(
    file: UploadFile = File(...),          # 업로드된 이미지 파일
    cvd_type: str = Form(...),             # 색약 유형: protan / deutan / tritan
    mode: str = Form("user"),              # 사용자 모드("user") 또는 개발자 모드("developer")
    lang: str = Form("ko"),                # 응답 언어: ko / en
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

    # Read into memory only; the image is never written to disk.
    # (한국어) 이미지를 메모리로만 읽기 — 10MB+1바이트까지만 읽어 크기 초과 여부를 확인
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise api_error("FILE_TOO_LARGE")

    try:
        img = load_image(data)             # 형식 검증 + 메모리상 이미지 객체 생성
    except ValueError as e:                # 허용되지 않는 포맷
        raise api_error("UNSUPPORTED_FORMAT") from e
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise api_error("INVALID_IMAGE") from e   # 깨졌거나 열 수 없는 파일

    try:
        return analyze_image(img, cvd_type, mode, lang)  # 분석 파이프라인 실행 후 결과 반환
    except Exception as e:  # never leak internals
        raise api_error("ANALYSIS_FAILED") from e      # 내부 오류는 사용자에게 상세 노출하지 않음
    finally:
        del data, img  # 분석 종료 후 메모리에서 즉시 해제 (이미지 비저장 규칙)
