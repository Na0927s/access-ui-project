"""(한국어 요약) 추천 색상(recommend)과 분석 파이프라인(analyzer)의 통합 테스트.
- 규칙 6번(재검증): 추천된 모든 색은 대비율·시뮬레이션 구분 가능성을 다시 통과해야 함
- 한/영 언어 출력이 올바른지도 검증 (영어 모드에 한글이 섞이면 안 됨)
"""
import pytest
from PIL import Image, ImageDraw

from app.services import texts
from app.services.analyzer import analyze_elements, analyze_image, confusion_verdict
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


# Previously xfailed: absolute ΔE thresholds alone let saturated red/green slip
# through as PASS under deutan (CIE76 overestimates residual distance after hue
# collapse). The ratio-based check added to confusion_verdict now catches it.
# (한국어) 과거 xfail: 절대 ΔE 임계값만으로는 빨강/초록이 deutan에서 PASS로 빠졌음.
# confusion_verdict에 추가된 비율 기반 검사가 이제 이를 잡아냄.
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
    # 전체 판정은 점수 구간 기반이라 verdict가 뭐든 result_message와 일치하면 됨
    assert out["result_message"] == texts.RESULT_MESSAGES[out["verdict"]]["en"]
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
    # 전체 판정은 점수 구간 기반. 미달 요소 1개(failed=1)와 verdict로 메시지 일관성 검증.
    if out["verdict"] == "PASS":
        expected = texts.DEV_RESULT["PASS"]["en"]
    else:
        expected = texts.DEV_RESULT[out["verdict"]]["en"].format(failed=1)
    assert out["result_message"] == expected
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


# --- confusion_verdict: 비율 기반 판정 단위 테스트 ---
# (한국어) confusion_verdict 단위 테스트 — 절대·비율 임계값이 의도대로 동작하는지 검증.

def test_confusion_already_similar_returns_none():
    # 원본에서도 거리가 DISTINCT_MIN(10) 미만이면 CVD 문제가 아님 → None
    assert confusion_verdict(5.0, 3.0) is None


def test_confusion_absolute_fail():
    # 시뮬레이션 후 잔여 ΔE가 CONFUSION_FAIL(5) 미만이면 FAIL (절대)
    assert confusion_verdict(100.0, 3.0) == "FAIL"


def test_confusion_absolute_warning():
    # 잔여 ΔE가 CONFUSION_WARN(8) 미만이면 WARNING (절대)
    assert confusion_verdict(100.0, 6.0) == "WARNING"


def test_confusion_clearly_distinct_passes():
    # 잔여가 크고 비율도 높으면(거의 안 줄음) PASS
    assert confusion_verdict(100.0, 100.0) == "PASS"


def test_confusion_ratio_catches_red_green():
    # 빨강/초록 쌍: 원본 거리 크지만 시뮬레이션이 대부분 붕괴 → FAIL/WARNING.
    # 절대 잔여(28)가 8보다 커서 절대 임계값은 PASS지만, 비율(0.16)이 잡아냄.
    d_orig, d_sim = 170.0, 28.0
    verdict = confusion_verdict(d_orig, d_sim)
    assert verdict in ("FAIL", "WARNING")  # 적어도 WARNING은 나와야 함


def test_confusion_ratio_strong_collapse_is_fail():
    # 거리가 10% 미만으로 붕괴 + 잔여 15(FAIL_ABS_MAX 20 이하) → FAIL
    assert confusion_verdict(150.0, 12.0) == "FAIL"


def test_confusion_ratio_does_not_flag_same_hue_lightness():
    # 같은 계열 명암(파랑/진파랑): 거리가 12%만 줄어듦 → 비율 0.88, PASS.
    # 비율 조건이 없으면 절대값만으로 오류 없지만, 비율 조건이 false positive를 내지 않는지 확인.
    assert confusion_verdict(27.0, 24.0) == "PASS"


def test_confusion_ratio_warn_threshold():
    # 거리가 약 40%로 붕괴(0.4 < WARN_RATIO 0.5) + 잔여 25(WARN_ABS_MAX 30 이하) → WARNING
    # (FAIL_RATIO 0.25보다는 크므로 FAIL 아님)
    assert confusion_verdict(60.0, 24.0) == "WARNING"


def test_confusion_ratio_fail_excluded_when_residual_too_large():
    # 비율은 FAIL 기준(0.25) 이하라도 잔여가 FAIL_ABS_MAX(20) 초과면 FAIL 아님.
    # 대신 WARN_RATIO(0.5) 이하 + WARN_ABS_MAX(30) 이하면 WARNING.
    assert confusion_verdict(200.0, 28.0) == "WARNING"  # ratio 0.14, 잔여 28
