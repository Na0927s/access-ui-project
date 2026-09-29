from fastapi import APIRouter

from ..errors import api_error
from ..schemas import DeveloperRequest
from ..services.analyzer import analyze_elements

router = APIRouter(prefix="/api/developer", tags=["developer"])


@router.post("/analyze")
def analyze_code(req: DeveloperRequest):
    try:
        return analyze_elements([e.model_dump() for e in req.elements], req.cvd_type, req.lang)
    except Exception as e:
        raise api_error("ANALYSIS_FAILED") from e
