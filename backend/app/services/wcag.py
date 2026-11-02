"""WCAG 2.x relative luminance, contrast ratio and verdicts.

(한국어 요약) WCAG 접근성 기준의 대비율(contrast ratio) 계산과 판정 담당.
- 상대 휘도(relative luminance)를 구해 두 색의 대비율을 1:1 ~ 21:1 범위로 산출
- 텍스트 크기/굵기에 따라 일반 텍스트(4.5:1)와 큰 텍스트(3:1) 기준을 다르게 판정
"""
import numpy as np

from .. import config
from .color import hex_to_rgb, srgb_to_linear


def relative_luminance(hex_str: str) -> float:
    # 색의 상대 휘도(0=검정, 1=흰색). WCAG 공식은 선형 RGB 값에 가중치를 곱한 합.
    # 가중치(0.2126, 0.7152, 0.0722)는 사람 눈이 초록에 가장 민감하다는 사실을 반영
    rgb = np.array(hex_to_rgb(hex_str), dtype=float) / 255.0
    r, g, b = srgb_to_linear(rgb)
    return float(0.2126 * r + 0.7152 * g + 0.0722 * b)


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    """Unrounded ratio; round only for display.

    (한국어) 두 색의 WCAG 대비율. 밝은 쪽 + 0.05 를 어두운 쪽 + 0.05 로 나눈 값.
    0.05를 더하는 이유: 순수 검정/흰색의 극단값을 보정하기 위한 WCAG 공식의 상수.
    """
    la, lb = relative_luminance(hex_a), relative_luminance(hex_b)
    light, dark = max(la, lb), min(la, lb)
    return (light + 0.05) / (dark + 0.05)


def is_large_text(font_size_px: float | None, font_weight: int | None) -> bool:
    # WCAG의 "큰 텍스트" 정의:
    # - 24px 이상이면 큰 텍스트, 또는
    # - bold(700 이상)이면서 18.66px(14pt) 이상이면 큰 텍스트 → 기준이 4.5:1 대신 3:1로 완화됨
    if font_size_px is None:
        return False
    bold = (font_weight or 400) >= 700
    return font_size_px >= 24 or (bold and font_size_px >= 18.66)


def judge(ratio: float) -> dict:
    # 대비율 하나를 세 가지 기준(일반 텍스트/큰 텍스트/UI 컴포넌트)으로 각각 PASS/FAIL 판정
    normal = "PASS" if ratio >= config.WCAG_NORMAL else "FAIL"
    large = "PASS" if ratio >= config.WCAG_LARGE else "FAIL"
    ui = "PASS" if ratio >= config.WCAG_UI else "FAIL"
    # 종합 판정: 일반 텍스트까지 통과면 PASS, 큰 텍스트만 통과면 WARNING, 둘 다 실패면 FAIL
    if normal == "PASS":
        verdict = "PASS"
    elif large == "PASS":
        verdict = "WARNING"
    else:
        verdict = "FAIL"
    return {"normal_text": normal, "large_text": large, "ui_component": ui, "verdict": verdict}
