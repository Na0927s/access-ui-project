"""(한국어 요약) API 엔드포인트 통합 테스트 (FastAPI TestClient 사용).
- 실제 HTTP 요청을 흉내 내어 라우터 → 서비스 → 응답 전체 흐름을 검증
- 프로젝트 규칙 위반 여부도 테스트로 확인 (사용자 모드에 추천 없음, 회원 API 없음 등)
"""
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _png() -> bytes:
    # 테스트용 단색 PNG 20x20 이미지를 메모리에서 생성
    buf = BytesIO()
    Image.new("RGB", (20, 20), "#EF4444").save(buf, format="PNG")
    return buf.getvalue()


def test_health():
    # 헬스체크 엔드포인트 동작 확인
    assert client.get("/api/health").json()["status"] == "ok"


def test_image_ok():
    # 이미지 분석 기본 요청이 200 OK를 반환하는지 확인
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 200


def test_image_user_mode_omits_recommendations():
    # 규칙 7번: 사용자 모드 응답에는 추천 색상(recommendations)이 없어야 함
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan", "mode": "user"})
    body = r.json()
    assert r.status_code == 200
    assert "recommendations" not in body
    assert body["verdict"] in ("PASS", "FAIL")
    assert body["result_message"]


def test_image_developer_mode_includes_recommendations():
    # 개발자 모드는 추천 색상을 포함해야 함
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan", "mode": "developer"})
    body = r.json()
    assert r.status_code == 200
    assert "recommendations" in body


def test_invalid_mode():
    # 허용되지 않는 모드 값은 INVALID_MODE 에러(422) 반환
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan", "mode": "guest"})
    assert r.status_code == 422 and r.json()["code"] == "INVALID_MODE"


def test_developer_analyze_verdict():
    # 코드 분석: 흰 글자/빨강 배경(4:1)은 일반 텍스트 기준 미달 → FAIL이어야 함
    r = client.post("/api/developer/analyze", json={
        "cvd_type": "protan",
        "elements": [{"selector": ".btn", "text": "삭제", "color": "#FFFFFF",
                      "background": "#FF0000", "font_size_px": 16, "font_weight": 400}],
    })
    body = r.json()
    assert r.status_code == 200
    assert body["verdict"] == "FAIL"
    assert body["result_message"]


def test_unsupported_format():
    # GIF 등 지원하지 않는 형식은 400 UNSUPPORTED_FORMAT
    r = client.post("/api/analysis/image", files={"file": ("a.gif", b"GIF89a", "image/gif")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 400 and r.json()["code"] == "UNSUPPORTED_FORMAT"


def test_corrupted_image():
    # 이미지가 아닌 데이터를 PNG로 속여 보내면 400 INVALID_IMAGE
    r = client.post("/api/analysis/image", files={"file": ("a.png", b"not an image", "image/png")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 400 and r.json()["code"] == "INVALID_IMAGE"


def test_too_large():
    # 10MB 초과 파일은 413 FILE_TOO_LARGE
    big = b"0" * (10 * 1024 * 1024 + 1)
    r = client.post("/api/analysis/image", files={"file": ("a.png", big, "image/png")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 413


def test_auth_routes_exist():
    # 규칙 2번(변경): 회원 관리(auth) API가 존재하는지 확인
    paths = set(app.openapi()["paths"])
    auth_paths = [p for p in paths if "/api/auth" in p]
    assert auth_paths, f"auth 라우터가 등록되어야 합니다. found: {auth_paths}"
    # 핵심 엔드포인트가 모두 있는지
    expected = {"/api/auth/signup", "/api/auth/login", "/api/auth/me/{user_id}", "/api/auth/history/{user_id}"}
    assert expected.issubset(paths), f"누락된 auth 엔드포인트: {expected - paths}"


def test_ai_fallback_without_key():
    # 규칙 4번: AI 키가 없어도 /api/ai/* 엔드포인트가 에러 없이 동작(fallback)하는지 확인
    r = client.post("/api/ai/translate", json={"target_lang": "en", "texts": ["안녕"]})
    assert r.status_code == 200
