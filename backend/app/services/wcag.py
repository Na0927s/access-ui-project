"""WCAG 2.x relative luminance, contrast ratio and verdicts."""
import numpy as np

from .. import config
from .color import hex_to_rgb, srgb_to_linear


def relative_luminance(hex_str: str) -> float:
    rgb = np.array(hex_to_rgb(hex_str), dtype=float) / 255.0
    r, g, b = srgb_to_linear(rgb)
    return float(0.2126 * r + 0.7152 * g + 0.0722 * b)


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    """Unrounded ratio; round only for display."""
    la, lb = relative_luminance(hex_a), relative_luminance(hex_b)
    light, dark = max(la, lb), min(la, lb)
    return (light + 0.05) / (dark + 0.05)


def is_large_text(font_size_px: float | None, font_weight: int | None) -> bool:
    if font_size_px is None:
        return False
    bold = (font_weight or 400) >= 700
    return font_size_px >= 24 or (bold and font_size_px >= 18.66)


def judge(ratio: float) -> dict:
    normal = "PASS" if ratio >= config.WCAG_NORMAL else "FAIL"
    large = "PASS" if ratio >= config.WCAG_LARGE else "FAIL"
    ui = "PASS" if ratio >= config.WCAG_UI else "FAIL"
    if normal == "PASS":
        verdict = "PASS"
    elif large == "PASS":
        verdict = "WARNING"
    else:
        verdict = "FAIL"
    return {"normal_text": normal, "large_text": large, "ui_component": ui, "verdict": verdict}
