"""(한국어 요약) WCAG 대비율 계산(wcag 모듈)의 단위 테스트.
- 알려진 기준값(검정/흰색 = 21:1 등)과 일치하는지, 판정 로직이 설계대로인지 검증
"""
import pytest

from app.services.wcag import contrast_ratio, is_large_text, judge


# WCAG 공식으로 미리 계산해 둔 기준값들 (구현이 공식과 일치하는지 확인)
@pytest.mark.parametrize("fg,bg,expected", [
    ("#000000", "#FFFFFF", 21.00),   # 검정/흰색 = 최대값 21:1
    ("#FFFFFF", "#FFFFFF", 1.00),    # 같은 색 = 최소값 1:1
    ("#767676", "#FFFFFF", 4.54),    # 4.5:1을 간신히 넘는 회색
    ("#777777", "#FFFFFF", 4.48),    # 4.5:1에 미달하는 회색
    ("#FFFFFF", "#FF0000", 4.00),    # 흰색/빨강 배경
])
def test_contrast_reference_values(fg, bg, expected):
    assert round(contrast_ratio(fg, bg), 2) == expected


def test_contrast_is_symmetric():
    # 대비율은 색 순서와 무관해야 함 (밝은/어두운 중 큰 쪽을 분자로 쓰므로)
    assert contrast_ratio("#123456", "#ABCDEF") == contrast_ratio("#ABCDEF", "#123456")


def test_judge():
    # 종합 판정 로직: 4.5 이상 PASS, 3.0 이상이면 WARNING(큰 텍스트만 통과), 미만 FAIL
    assert judge(4.54)["verdict"] == "PASS"
    assert judge(4.48)["verdict"] == "WARNING"   # large text only
    assert judge(2.5)["verdict"] == "FAIL"


def test_large_text():
    # 큰 텍스트 판정: 24px 이상 또는 bold+18.66px 이상
    assert is_large_text(24, 400)      # 24px 일반 굵기 → 큰 텍스트
    assert is_large_text(19, 700)       # bold 19px → 큰 텍스트
    assert not is_large_text(16, 700)   # bold여도 18.66px 미만 → 아님
    assert not is_large_text(None, None)  # 폰트 정보 없음 → 아님
