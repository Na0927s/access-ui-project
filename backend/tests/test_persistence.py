"""(한국어 요약) 분석 결과 저장·캐시(persistence) 단위 테스트.

검증 대상:
- image_hash: SHA-256 해시 (캐시 키)
- save_result: 규칙 1(비로그인 저장 금지), mode 검증, 시뮬레이션 이미지 제거
- get_cached / set_cached: 캐시 upsert, mode·cvd_type 키 분리
- serialize_history_item: 응답 직렬화

격리: 메인 DB(colorlens.db)를 오염시키지 않도록 인메모리 SQLite 엔진을
fixture로 생성해 테스트마다 스키마를 새로 만든다.
"""
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models import AnalysisCache, AnalysisResult, User
from app.services.persistence import (
    get_cached,
    image_hash,
    save_result,
    serialize_history_item,
    set_cached,
)


@pytest.fixture()
def db() -> Session:
    # 인메모리 SQLite로 격리된 세션 제공. 메인 DB에 쓰지 않는다.
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    try:
        yield session
    finally:
        session.close()


def _make_user(db: Session) -> int:
    # 테스트용 사용자 한 명 생성 후 id 반환
    u = User(name="테스터", email="t@example.com", login_id="tester", password_hash="x")
    db.add(u)
    db.commit()
    return u.id


# --- image_hash ---

def test_image_hash_is_sha256_hex():
    # SHA-256은 64자리 hex 문자열
    h = image_hash(b"hello")
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_image_hash_deterministic_and_distinct():
    # 같은 바이트 → 같은 해시, 다른 바이트 → 다른 해시
    assert image_hash(b"a") == image_hash(b"a")
    assert image_hash(b"a") != image_hash(b"b")


# --- save_result: 규칙 1 (비로그인 저장 금지) ---

def test_save_result_skips_anonymous():
    # 비로그인(user_id=None)이면 저장하지 않고 False 반환 (규칙 1)
    db_session = None  # 더미 — 호출되지 않아야 함
    ok = save_result(db_session, None, "user", "deutan", {"score": 80, "verdict": "PASS"})
    assert ok is False


def test_save_result_persists_for_logged_in_user(db):
    # 로그인 사용자는 저장되고 True 반환
    uid = _make_user(db)
    result = {"score": 70, "verdict": "FAIL", "simulated_image": "data:image/png;base64,AAAA"}
    ok = save_result(db, uid, "user", "deutan", result, input_meta="a.png")
    assert ok is True
    rows = db.query(AnalysisResult).all()
    assert len(rows) == 1
    assert rows[0].user_id == uid
    assert rows[0].mode == "user"
    assert rows[0].cvd_type == "deutan"
    assert rows[0].input_meta == "a.png"
    assert rows[0].score == 70
    assert rows[0].verdict == "FAIL"


def test_save_result_strips_simulated_image(db):
    # 시뮬레이션 base64는 저장 시 제거되어야 함 (용량·프라이버시)
    uid = _make_user(db)
    result = {"score": 70, "verdict": "FAIL", "simulated_image": "data:image/png;base64,HUGE"}
    save_result(db, uid, "user", "deutan", result)
    row = db.query(AnalysisResult).first()
    stored = json.loads(row.result_json)
    assert stored["simulated_image"] is None
    # 다른 필드는 보존
    assert stored["score"] == 70
    assert stored["verdict"] == "FAIL"


def test_save_result_rejects_invalid_mode(db):
    # VALID_MODES가 아닌 mode는 ValueError (잘못된 값이 DB에 들어가는 것 방지)
    uid = _make_user(db)
    with pytest.raises(ValueError):
        save_result(db, uid, "invalid-mode", "deutan", {"score": 1})


def test_save_result_accepts_all_valid_modes(db):
    # 세 가지 허용 모드 모두 저장 가능
    uid = _make_user(db)
    for mode in ("user", "developer", "developer-code"):
        save_result(db, uid, mode, "protan", {"score": 50, "verdict": "PASS"})
    assert db.query(AnalysisResult).count() == 3


def test_save_result_defaults_verdict_to_pass(db):
    # verdict 키가 없으면 기본값 PASS
    uid = _make_user(db)
    save_result(db, uid, "user", "deutan", {"score": 100})
    row = db.query(AnalysisResult).first()
    assert row.verdict == "PASS"


# --- get_cached / set_cached ---

def test_cache_set_then_get(db):
    # 저장한 캐시를 동일 키로 조회할 수 있어야 함
    result = {"score": 42, "verdict": "PASS"}
    set_cached(db, "hash1", "deutan", "user", result)
    got = get_cached(db, "hash1", "deutan", "user")
    assert got == result


def test_cache_miss_returns_none(db):
    # 없는 키는 None
    assert get_cached(db, "nope", "deutan", "user") is None


def test_cache_upsert_overwrites(db):
    # 같은 키 재저장은 새 행이 아닌 갱신(upsert)
    set_cached(db, "hash1", "deutan", "user", {"score": 1})
    set_cached(db, "hash1", "deutan", "user", {"score": 2})
    assert db.query(AnalysisCache).count() == 1
    assert get_cached(db, "hash1", "deutan", "user")["score"] == 2


def test_cache_key_separates_by_cvd(db):
    # 같은 해시라도 색약 유형이 다르면 별도 캐시
    set_cached(db, "hash1", "deutan", "user", {"score": 1})
    set_cached(db, "hash1", "protan", "user", {"score": 2})
    assert db.query(AnalysisCache).count() == 2
    assert get_cached(db, "hash1", "deutan", "user")["score"] == 1
    assert get_cached(db, "hash1", "protan", "user")["score"] == 2


def test_cache_key_separates_by_mode(db):
    # 같은 해시·색약이어도 모드가 다르면 별도 캐시 (user/developer 결과 구조가 다름)
    set_cached(db, "hash1", "deutan", "user", {"score": 1})
    set_cached(db, "hash1", "deutan", "developer", {"score": 2})
    assert db.query(AnalysisCache).count() == 2
    assert get_cached(db, "hash1", "deutan", "user")["score"] == 1
    assert get_cached(db, "hash1", "deutan", "developer")["score"] == 2


def test_cache_returns_none_on_corrupt_json(db):
    # result_json이 깨진 경우 None (예외 전파 대신 안전한 fallback)
    uid = _make_user(db)  # 사용자 필요 없지만 세션 초기화용
    cache_row = AnalysisCache(image_hash="bad", cvd_type="deutan", mode="user", result_json="{not json")
    db.add(cache_row)
    db.commit()
    assert get_cached(db, "bad", "deutan", "user") is None


# --- serialize_history_item ---

def test_serialize_history_item_parses_json(db):
    # 히스토리 행을 응답 dict로 변환 — result_json이 파싱되어 data에 들어감
    uid = _make_user(db)
    save_result(db, uid, "developer-code", "protan", {"score": 88, "verdict": "PASS"})
    row = db.query(AnalysisResult).first()
    out = serialize_history_item(row)
    assert out["user_id"] == uid
    assert out["mode"] == "developer-code"
    assert out["cvd_type"] == "protan"
    assert out["score"] == 88
    assert out["verdict"] == "PASS"
    assert out["data"]["score"] == 88
    assert isinstance(out["created_at"], str)


def test_serialize_history_item_handles_empty_json(db):
    # result_json이 None/빈 값이면 data는 빈 dict로 fallback
    uid = _make_user(db)
    row = AnalysisResult(user_id=uid, mode="user", cvd_type="deutan", verdict="PASS", result_json="")
    db.add(row)
    db.commit()
    out = serialize_history_item(row)
    assert out["data"] == {}
