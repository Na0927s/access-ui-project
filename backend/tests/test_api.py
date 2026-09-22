from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _png() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (20, 20), "#EF4444").save(buf, format="PNG")
    return buf.getvalue()


def test_health():
    assert client.get("/api/health").json()["status"] == "ok"


def test_image_ok():
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 200


def test_image_user_mode_omits_recommendations():
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan", "mode": "user"})
    body = r.json()
    assert r.status_code == 200
    assert "recommendations" not in body
    assert body["verdict"] in ("PASS", "FAIL")
    assert body["result_message"]


def test_image_developer_mode_includes_recommendations():
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan", "mode": "developer"})
    body = r.json()
    assert r.status_code == 200
    assert "recommendations" in body


def test_invalid_mode():
    r = client.post("/api/analysis/image", files={"file": ("a.png", _png(), "image/png")},
                    data={"cvd_type": "deutan", "mode": "guest"})
    assert r.status_code == 422 and r.json()["code"] == "INVALID_MODE"


def test_developer_analyze_verdict():
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
    r = client.post("/api/analysis/image", files={"file": ("a.gif", b"GIF89a", "image/gif")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 400 and r.json()["code"] == "UNSUPPORTED_FORMAT"


def test_corrupted_image():
    r = client.post("/api/analysis/image", files={"file": ("a.png", b"not an image", "image/png")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 400 and r.json()["code"] == "INVALID_IMAGE"


def test_too_large():
    big = b"0" * (10 * 1024 * 1024 + 1)
    r = client.post("/api/analysis/image", files={"file": ("a.png", big, "image/png")},
                    data={"cvd_type": "deutan"})
    assert r.status_code == 413


def test_no_user_routes():
    paths = set(app.openapi()["paths"])
    assert not any("user" in p or "login" in p or "auth" in p for p in paths)


def test_ai_fallback_without_key():
    r = client.post("/api/ai/translate", json={"target_lang": "en", "texts": ["안녕"]})
    assert r.status_code == 200
