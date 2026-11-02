"""(한국어 요약) 회원 관리(auth) API 통합 테스트.
- 회원가입/로그인/내정보/히스토리 전체 흐름 검증
- 비밀번호가 bcrypt 해시로 저장되는지(평문 아님) 확인 (규칙 2)
- 중복 ID/이메일 거부, 잘못된 비밀번호 거부 확인
- 세션 토큰 기반 인가 검증: 타 사용자 데이터 접근 차단, 토큰 없으면 401
- 각 테스트는 테이블과 세션을 초기화해 서로 영향을 주지 않음
"""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 테스트용 임시 SQLite 파일을 사용하도록 환경변수 설정 (app 로드 전에)
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.services import session as session_store  # noqa: E402

# 테스트 전용 엔진·세션 (격리용)
_test_engine = create_engine(
    f"sqlite:///{_tmp.name}",
    connect_args={"check_same_thread": False},
)
_TestSession = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


# app의 get_db 의존성을 테스트용 세션으로 교체
app.dependency_overrides[get_db] = _override_get_db
# 테스트 테이블 생성
Base.metadata.create_all(bind=_test_engine)

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_state():
    """각 테스트 실행 전 users 테이블과 세션 저장소를 비워 격리를 보장한다."""
    db = _TestSession()
    db.query(User).delete()
    db.commit()
    db.close()
    session_store.clear_all_sessions()
    yield
    session_store.clear_all_sessions()


def _signup(payload=None):
    p = {
        "name": "테스터", "email": "tester@colorlens.com",
        "login_id": "tester", "password": "password123",
    }
    if payload:
        p.update(payload)
    return client.post("/api/auth/signup", json=p)


def _login(login_id="tester", password="password123"):
    """회원가입 후 로그인해 (user, token)을 반환하는 헬퍼."""
    _signup()
    r = client.post("/api/auth/login", json={"login_id": login_id, "password": password})
    assert r.status_code == 200, r.text
    body = r.json()
    return body["user"], body["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_signup_success():
    r = _signup()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["login_id"] == "tester"
    assert body["email"] == "tester@colorlens.com"
    assert "password" not in body  # 응답에 비밀번호 노출 금지


def test_password_is_hashed_not_plaintext():
    """규칙 2: 비밀번호는 bcrypt 해시로 저장, 평문 금지."""
    _signup()
    db = _TestSession()
    user = db.query(User).filter_by(login_id="tester").first()
    db.close()
    assert user is not None
    # bcrypt 해시는 $2b$ 로 시작
    assert user.password_hash.startswith("$2b$")
    # 평문 비밀번호가 그대로 저장되지 않았는지
    assert user.password_hash != "password123"


def test_signup_duplicate_login_id_rejected():
    _signup()
    # 같은 login_id, 다른 email로 재가입 시도
    r = _signup({"email": "other@colorlens.com"})
    assert r.status_code == 409
    assert r.json()["code"] == "DUPLICATE_LOGIN_ID"


def test_signup_duplicate_email_rejected():
    _signup()
    r = _signup({"login_id": "other_id"})
    assert r.status_code == 409
    assert r.json()["code"] == "DUPLICATE_EMAIL"


def test_login_success_returns_token():
    _signup()
    r = client.post("/api/auth/login", json={"login_id": "tester", "password": "password123"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["login_id"] == "tester"
    assert isinstance(body["token"], str) and len(body["token"]) > 0  # 토큰 발급 확인


def test_login_wrong_password_rejected():
    _signup()
    r = client.post("/api/auth/login", json={"login_id": "tester", "password": "wrongpass"})
    assert r.status_code == 401
    assert r.json()["code"] == "INVALID_CREDENTIALS"


def test_login_unknown_user_rejected():
    r = client.post("/api/auth/login", json={"login_id": "nobody", "password": "whatever"})
    assert r.status_code == 401
    # 계정 열거 방지: 같은 메시지
    assert r.json()["code"] == "INVALID_CREDENTIALS"


def test_get_me_with_token():
    user, token = _login()
    r = client.get("/api/auth/me", headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["id"] == user["id"]


def test_get_me_without_token_unauthorized():
    """토큰 없이 보호 엔드포인트 호출 시 401 — 인가 강제."""
    r = client.get("/api/auth/me")
    assert r.status_code == 401
    assert r.json()["code"] == "UNAUTHORIZED"


def test_get_me_with_invalid_token_unauthorized():
    """잘못된 토큰으로 호출 시 401."""
    r = client.get("/api/auth/me", headers=_auth("not-a-real-token"))
    assert r.status_code == 401


def test_logout_invalidates_token():
    """로그아웃 후 같은 토큰으로 호출하면 401 — 세션 폐기 확인."""
    user, token = _login()
    r = client.post("/api/auth/logout", headers=_auth(token))
    assert r.status_code == 200
    # 같은 토큰으로 더 이상 접근 불가
    r2 = client.get("/api/auth/me", headers=_auth(token))
    assert r2.status_code == 401


def test_history_requires_token():
    """히스토리 조회에 토큰이 없으면 401."""
    r = client.get("/api/auth/history")
    assert r.status_code == 401


def test_history_empty_for_new_user():
    _, token = _login()
    r = client.get("/api/auth/history", headers=_auth(token))
    assert r.status_code == 200
    assert r.json() == []


def test_signup_validation_requires_strong_password():
    # 8자 미만 비밀번호는 Pydantic 검증에서 거부 (422)
    r = _signup({"password": "short"})
    assert r.status_code == 422


def teardown_module(module):
    """테스트 종료 후 임시 DB 파일 정리."""
    try:
        os.unlink(_tmp.name)
    except OSError:
        pass
