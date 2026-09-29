"""Alternative color recommendation with re-verification.

Candidates keep the CIELAB hue (a*, b*) and move lightness L*. Every candidate
is re-checked for contrast AND for distinguishability after CVD simulation.
"""
import numpy as np

from .. import config
from . import texts
from .color import cielab_to_hex, delta_e, hex_to_cielab
from .cvd import simulate_hex
from .wcag import contrast_ratio


def grade_of(ratio: float) -> str | None:
    if ratio >= config.WCAG_AAA_NORMAL:
        return "STRONG"
    if ratio >= config.WCAG_NORMAL:
        return "RECOMMENDED"
    if ratio >= config.WCAG_LARGE:
        return "CONDITIONAL"
    return None


def verify(candidate: str, against: str, cvd_type: str, lang: str = "ko") -> dict | None:
    """Re-verification. Returns candidate info if it passes, else None."""
    ratio = contrast_ratio(candidate, against)
    grade = grade_of(ratio)
    if grade is None:
        return None
    sim_dist = delta_e(simulate_hex(candidate, cvd_type), simulate_hex(against, cvd_type))
    if sim_dist < config.CONFUSION_WARN:
        return None
    return {
        "hex": candidate,
        "ratio": round(ratio, 2),
        "grade": grade,
        "reason": texts.GRADE_REASON[grade][lang],
        "distance_simulated": round(sim_dist, 3),
    }


def recommend(current: str, against: str, cvd_type: str, lang: str = "ko", limit: int = 3) -> dict:
    base = hex_to_cielab(current)
    seen: set[str] = set()
    passed: list[dict] = []
    for step in np.arange(2.0, 100.0, 2.0):
        for sign in (-1, 1):
            lab = base.copy()
            lab[0] = float(np.clip(base[0] + sign * step, 0.0, 100.0))
            cand = cielab_to_hex(lab)
            if cand in seen or cand == current.upper():
                continue
            seen.add(cand)
            info = verify(cand, against, cvd_type, lang)
            if info:
                info["distance_from_current"] = round(delta_e(cand, current), 3)
                passed.append(info)

    # Prefer the best grade per closeness: take closest candidates, keep grade variety.
    passed.sort(key=lambda c: c["distance_from_current"])
    picked: list[dict] = []
    for grade in ("RECOMMENDED", "STRONG", "CONDITIONAL"):
        for c in passed:
            if c["grade"] == grade and c not in picked:
                picked.append(c)
                break
    picked.sort(key=lambda c: c["distance_from_current"])
    return {
        "current": current.upper(),
        "against": against.upper(),
        "candidates": picked[:limit],
        "non_color_tips": [tip[lang] for tip in texts.NON_COLOR_TIPS],
    }
