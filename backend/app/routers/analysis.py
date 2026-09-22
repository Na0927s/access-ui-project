from fastapi import APIRouter, File, Form, UploadFile
from PIL import Image, UnidentifiedImageError

from .. import config
from ..errors import api_error
from ..services.analyzer import analyze_image, load_image

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/image")
async def analyze_image_endpoint(
    file: UploadFile = File(...),
    cvd_type: str = Form(...),
    mode: str = Form("user"),
):
    if cvd_type not in ("protan", "deutan", "tritan"):
        raise api_error("INVALID_CVD_TYPE")
    if mode not in ("user", "developer"):
        raise api_error("INVALID_MODE")
    if file.content_type not in config.ALLOWED_CONTENT_TYPES:
        raise api_error("UNSUPPORTED_FORMAT")

    # Read into memory only; the image is never written to disk.
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise api_error("FILE_TOO_LARGE")

    try:
        img = load_image(data)
    except ValueError as e:
        raise api_error("UNSUPPORTED_FORMAT") from e
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise api_error("INVALID_IMAGE") from e

    try:
        return analyze_image(img, cvd_type, mode)
    except Exception as e:  # never leak internals
        raise api_error("ANALYSIS_FAILED") from e
    finally:
        del data, img
