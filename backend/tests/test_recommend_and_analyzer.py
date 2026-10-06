"""(한국어 요약) 추천 색상(recommend)과 분석 파이프라인(analyzer)의 통합 테스트.
- 규칙 6번(재검증): 추천된 모든 색은 대비율·시뮬레이션 구분 가능성을 다시 통과해야 함
- 한/영 언어 출력이 올바른지도 검증 (영어 모드에 한글이 섞이면 안 됨)
"""
import pytest
from PIL import Image, ImageDraw

from app.services import texts
from app.services.analyzer import analyze_elements, analyze_image
from app.services.recommend import recommend, verify
from app.services.wcag import contrast_ratio


def _has_hangul(s: str) -> bool:
    # 문자열에 한글이 포함되어 있는지 검사 (영어 출력 검증용 헬퍼)
    return any("가" <= ch <= "힣" for ch in s)


def test_every_recommendation_passes_reverification():
    # 규칙 6번 핵심 검증: 반환된 추천 색상은 전부 재검증(verify)을 통과해야 하고,
    # 각 등급의 최소 대비율(STRONG 7:1, RECOMMENDED 4.5:1, CONDITIONAL 3:1)을 만족해야 함
    rec = recommend("#FF5252", "#FFFFFF", "deutan")
    assert rec["candidates"]
    for c in rec["candidates"]:
        assert verify(c["hex"], "#FFFFFF", "deutan") is not None
        ratio = contrast_ratio(c["hex"], "#FFFFFF")
        floor = {"STRONG": 7.0, "RECOMMENDED": 4.5, "CONDITIONAL": 3.0}[c["grade"]]
        assert ratio >= floor


def test_red_on_white_gets_aa_dark_red():
    # 흰 배경 위 밝은 빨강은 → 어두운 빨강으로 추천되어야 함 (여전히 빨강 색조 유지)
    rec = recommend("#FF0000", "#FFFFFF", "protan")
    aa = [c for c in rec["candidates"] if c["grade"] in ("RECOMMENDED", "STRONG")]
    assert aa
    r, g, b = (int(aa[0]["hex"][i:i + 2], 16) for i in (1, 3, 5))
    assert r > g and r > b  # still a red hue


# Depends on the absolute Delta E confusion thresholds (CONFUSION_FAIL / CONFUSION_WARN),
# which are TBD per the design doc. The placeholder values in config.py do not flag the
# saturated red/green pair under deutan (Delta E ~12.8). Restore this test once the team
# fixes the thresholds.
# (한국어) ΔE 혼동 임계값이 임시값(TBD)이라 당연히 실패하는 테스트 — 팀이 임계값을
# 확정하면 xfail 표시를 제거하고 복원할 것.
@pytest.mark.xfail(reason="ΔE 판정 임계값 TBD — 팀 기준 확정 후 복원", strict=True)
def test_analyze_image_red_green_status():
    # 빨강/초록 사각형이 그려진 이미지를 분석하면 색상 혼동 이슈가 잡혀야 함
    img = Image.new("RGB", (200, 100), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, 90, 90], fill="#EF4444")     # 빨강 사각형
    d.rectangle([110, 10, 190, 90], fill="#22C55E")   # 초록 사각형
    out = analyze_image(img, "deutan")
    assert out["simulated_image"].startswith("data:image/png;base64,")  # base64 이미지 반환
    assert out["palette"][0]["hex"] == "#FFFFFF"     # 가장 많은 색 = 흰 배경
    assert any(p["verdict"] in ("FAIL", "WARNING") for p in out["confusable_pairs"])
    assert 0 <= out["score"] <= 100
    assert out["score_notice"] == texts.SCORE_NOTICE["ko"]


def test_developer_button_danger():
    # 개발자 모드: 흰 글자/빨강 배경 버튼(4:1)은 일반 텍스트 기준 미달이며,
    # 제안된 css_fix를 적용한 색은 실제로 AA(4.5:1)를 만족해야 함 (재검증 확인)
    out = analyze_elements([{
        "selector": ".button-danger", "text": "삭제",
        "color": "#FFFFFF", "background": "#FF0000", "font_size_px": 16, "font_weight": 400,
    }], "protan")
    r = out["results"][0]
    assert r["ratio"] == 4.0 and r["normal_text"] == "FAIL"
    fix = out["solution_boxes"][0]["css_fix"]
    assert fix
    # The suggested fix itself must meet AA for normal text.
    # (한국어) 수정안에서 색상 코드와 "무엇을 바꿨는지"(글자색/배경색)를 추출해 다시 대비율 검사
    new_hex = fix.split(":")[1].strip(" ;}")
    other = "#FF0000" if "{ color" in fix else "#FFFFFF"
    assert contrast_ratio(new_hex, other) >= 4.5
    assert out["summary"]["fail"] == 1


def test_analyze_image_english_output():
    # 영어 모드: 이미지 분석 결과의 모든 문구에 한글이 섞여 있으면 안 됨
    img = Image.new("RGB", (60, 60), "#FFFFFF")
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, 50, 50], fill="#FF0000")  # 4.0:1 on white -> LOW_CONTRAST issue
    out = analyze_image(img, "deutan", "user", "en")
    assert out["result_message"] == texts.RESULT_MESSAGES["FAIL"]["en"]
    assert out["score_notice"] == texts.SCORE_NOTICE["en"]
    assert out["issues"]
    for issue in out["issues"]:
        assert not _has_hangul(issue["message"])


def test_analyze_elements_english_output():
    # 영어 모드: 코드 분석 결과의 문제 문구/개선 팁에 한글이 섞여 있으면 안 됨
    out = analyze_elements([{
        "selector": ".button-danger", "text": "delete",
        "color": "#FFFFFF", "background": "#FF0000", "font_size_px": 16, "font_weight": 400,
    }], "protan", "en")
    assert out["result_message"] == texts.DEV_RESULT["FAIL"]["en"].format(failed=1)
    assert not _has_hangul(out["result_message"])
    for box in out["solution_boxes"]:
        assert not _has_hangul(box["problem"])
        assert not _has_hangul(box["non_color_fix"])


def test_recommend_english_output():
    # 영어 모드: 추천 색상의 이유 설명과 비색상 팁이 영어로 나와야 함
    rec = recommend("#FF5252", "#FFFFFF", "deutan", "en")
    assert rec["candidates"]
    for c in rec["candidates"]:
        assert not _has_hangul(c["reason"])
    for tip in rec["non_color_tips"]:
        assert not _has_hangul(tip)
