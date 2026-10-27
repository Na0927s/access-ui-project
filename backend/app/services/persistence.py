"""Persistence helpers for analysis results (logged-in users only) and cache.

(한국어 요약) 분석 결과 저장·조회 유틸 — 규칙 1(저장 정책) 구현.
- save_result(): 로그인 사용자(user_id 있음)의 분석 결과만 DB에 저장. 비로그인은 저장 안 함.
- 이미지 바이트는 절대 저장하지 않고, 결과 JSON 안의 시뮬레이션 base64도
  용량·프라이버시를 고려해 저장 시 제거 옵션을 둔다 (기본: 메타만 보관).
- 캐시(AnalysisCache)는 로그인 여부와 무관하게 적용 가능 — 같은 이미지 해시+색약 유형이면
  재분석 없이 결과 재사용. 단, 캐시 결과에도 동일하게 user_id가 있으면 결과를 저장한다.

설계 원칙 (규칙 1·3 준수):
- 비로그인 결과는 DB에 쓰지 않는다 (user_id NOT NULL 제약으로 보장).
- 이미지 바이트가 아닌 해시(SHA-256)만 키로 사용한다.
"""
import hashlib
import json
from typing import Any

from sqlalchemy.orm import Session

from ..models import AnalysisCache, AnalysisResult

# 허용된 분석 모드 — save_result/get_cached/set_cached 인자로 받는 mode는 이 값 중 하나여야 함.
# AnalysisResult(히스토리)는 3종 모두 저장, AnalysisCache(캐시)는 이미지 분석 2종만 사용.
VALID_MODES = {"user", "developer", "developer-code"}


def image_hash(image_bytes: bytes) -> str:
    """업로드 이미지의 SHA-256 해시를 계산. 캐시 키로만 사용 (이미지 바이트는 저장 안 함)."""
    return hashlib.sha256(image_bytes).hexdigest()


def _strip_simulated_image(result: dict) -> dict:
    """저장용 결과 복사본에서 시뮬레이션 base64를 제거해 용량·프라이버시 절감.

    (한국어) 결과 안의 simulated_image(이미지 데이터)는 용량이 크고 재생성 가능하므로
    히스토리 저장 시엔 메타만 남긴다. 단, 통계·점수·판정은 그대로 보관.
    """
    stripped = dict(result)
    # 이미지 모드 결과에만 존재하는 필드
    if "simulated_image" in stripped:
        stripped["simulated_image"] = None
    return stripped


def save_result(
    db: Session,
    user_id: int | None,
    mode: str,
    cvd_type: str,
    result: dict,
    input_meta: str | None = None,
) -> bool:
    """로그인 사용자의 분석 결과를 DB에 저장. 비로그인(user_id None)이면 저장하지 않고 False 반환.

    (한국어) 규칙 1: 비로그인 결과는 저장하지 않는다. 이 함수는 로그인 사용자만 처리.
    """
    if user_id is None:
        return False
    if mode not in VALID_MODES:
        raise ValueError(f"Invalid mode: {mode!r}. Expected one of {VALID_MODES}")
    record = AnalysisResult(
        user_id=user_id,
        mode=mode,
        cvd_type=cvd_type,
        input_meta=input_meta,
        score=result.get("score"),
        verdict=result.get("verdict", "PASS"),
        # 시뮬레이션 이미지 base64를 빼고 저장해 용량 절감
        result_json=json.dumps(_strip_simulated_image(result), ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    return True


def get_cached(db: Session, image_hash_value: str, cvd_type: str, mode: str) -> dict | None:
    """캐시 조회: 같은 이미지 해시 + 색약 유형 + 모드의 결과가 있으면 반환, 없으면 None.

    mode를 키에 포함하는 이유: user/developer 모드는 결과 구조(recommendations 포함 여부)가
    달라서, 한쪽 결과로 다른 쪽을 덮어쓰면 안 됨.
    """
    row = db.query(AnalysisCache).filter_by(
        image_hash=image_hash_value, cvd_type=cvd_type, mode=mode
    ).first()
    if not row:
        return None
    try:
        return json.loads(row.result_json)
    except (json.JSONDecodeError, TypeError):
        return None


def set_cached(db: Session, image_hash_value: str, cvd_type: str, mode: str, result: dict) -> None:
    """캐시 저장: 같은 조합이 있으면 갱신, 없으면 새로 삽입 (upsert)."""
    row = db.query(AnalysisCache).filter_by(
        image_hash=image_hash_value, cvd_type=cvd_type, mode=mode
    ).first()
    payload = json.dumps(result, ensure_ascii=False)
    if row:
        row.result_json = payload
    else:
        db.add(AnalysisCache(
            image_hash=image_hash_value, cvd_type=cvd_type, mode=mode, result_json=payload
        ))
    db.commit()


def serialize_history_item(row: AnalysisResult) -> dict[str, Any]:
    """히스토리 한 줄을 API 응답용 dict로 변환. result_json은 파싱해 포함."""
    try:
        data = json.loads(row.result_json) if row.result_json else {}
    except (json.JSONDecodeError, TypeError):
        data = {}
    return {
        "id": row.id,
        "user_id": row.user_id,
        "mode": row.mode,
        "cvd_type": row.cvd_type,
        "input_meta": row.input_meta,
        "score": row.score,
        "verdict": row.verdict,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "data": data,  # 시뮬레이션 이미지는 제거되어 있음 (메타·판정·점수만)
    }
