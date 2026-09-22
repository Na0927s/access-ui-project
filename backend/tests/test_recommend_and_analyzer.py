import pytest
from PIL import Image, ImageDraw

from app import config
from app.services.analyzer import analyze_elements, analyze_image
from app.services.recommend import recommend, verify
from app.services.wcag import contrast_ratio


def test_every_recommendation_passes_reverification():
    rec = recommend("#FF5252", "#FFFFFF", "deutan")
    assert rec["candidates"]
    for c in rec["candidates"]:
        assert verify(c["hex"], "#FFFFFF", "deutan") is not None
        ratio = contrast_ratio(c["hex"], "#FFFFFF")
        floor = {"STRONG": 7.0, "RECOMMENDED": 4.5, "CONDITIONAL": 3.0}[c["grade"]]
        assert ratio >= floor


def test_red_on_white_gets_aa_dark_red():
    rec = recommend("#FF0000", "#FFFFFF", "protan")
    aa = [c for c in rec["candidates"] if c["grade"] in ("RECOMMENDED", "STRONG")]
    assert aa
    r, g, b = (int(aa[0]["hex"][i:i + 2], 16) for i in (1, 3, 5))
    assert r > g and r > b  # still a red hue


# Depends on the absolute Delta E confusion thresholds (CONFUSION_FAIL / CONFUSION_WARN),
# which are TBD per the design doc. The placeholder values in config.py do not flag the
# saturated red/green pair under deutan (Delta E ~12.8). Restore this test once the team
# fixes the thresholds.
@pytest.mark.xfail(reason="ΔE 판정 임계값 TBD — 팀 기준 확정 후 복원", strict=True)
def test_analyze_image_red_green_status():
    img = Image.new("RGB", (200, 100), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, 90, 90], fill="#EF4444")
    d.rectangle([110, 10, 190, 90], fill="#22C55E")
    out = analyze_image(img, "deutan")
    assert out["simulated_image"].startswith("data:image/png;base64,")
    assert out["palette"][0]["hex"] == "#FFFFFF"
    assert any(p["verdict"] in ("FAIL", "WARNING") for p in out["confusable_pairs"])
    assert 0 <= out["score"] <= 100
    assert out["score_notice"] == config.SCORE_NOTICE


def test_developer_button_danger():
    out = analyze_elements([{
        "selector": ".button-danger", "text": "삭제",
        "color": "#FFFFFF", "background": "#FF0000", "font_size_px": 16, "font_weight": 400,
    }], "protan")
    r = out["results"][0]
    assert r["ratio"] == 4.0 and r["normal_text"] == "FAIL"
    fix = out["solution_boxes"][0]["css_fix"]
    assert fix
    # The suggested fix itself must meet AA for normal text.
    new_hex = fix.split(":")[1].strip(" ;}")
    other = "#FF0000" if "{ color" in fix else "#FFFFFF"
    assert contrast_ratio(new_hex, other) >= 4.5
    assert out["summary"]["fail"] == 1
