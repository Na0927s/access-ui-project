"""Alternative color recommendation with re-verification.

Candidates keep the OKLab hue (a, b) and move lightness L. Every candidate
is re-checked for contrast AND for distinguishability after CVD simulation.

(한국어 요약) 대체(추천) 색상 추천 모듈 — 프로젝트 규칙 6번(재검증)의 핵심.
- 원래 색의 색조(hue)는 유지하면서 밝기(L)만 밝게/어둡게 이동한 후보들을 만들고
- 각 후보를 ① WCAG 대비율 ② 시뮬레이션 후 구분 가능성(ΔE) 으로 다시 검사
- 두 검사를 모두 통과한 색만 결과에 포함 (검증 실패 시 None 반환)
"""
import numpy as np

from .. import config
from . import texts
from .color import delta_e, hex_to_oklab, oklab_to_hex
from .cvd import simulate_hex
from .wcag import contrast_ratio


def grade_of(ratio: float) -> str | None:
    # 대비율에 따른 등급 판정: AAA(7:1) 이상=STRONG, AA(4.5:1)=RECOMMENDED,
    # 큰 텍스트 기준(3:1)=CONDITIONAL, 그 미만은 사용 불가(None)
    if ratio >= config.WCAG_AAA_NORMAL:
        return "STRONG"
    if ratio >= config.WCAG_NORMAL:
        return "RECOMMENDED"
    if ratio >= config.WCAG_LARGE:
        return "CONDITIONAL"
    return None


def verify(candidate: str, against: str, cvd_type: str) -> dict | None:
    """Re-verification. Returns candidate info if it passes, else None.

    (한국어) 후보 색 재검증. 통과하면 정보 dict, 실패하면 None을 반환.
    1) 상대 색과의 WCAG 대비율이 최소 3:1은 넘는가
    2) 색각이상 시뮬레이션을 적용해도 상대 색과 OKLab ΔE(CONFUSION_WARN) 이상으로 구분되는가

    lang 의존 문구(reason)는 여기서 넣지 않고 localizer에서 덧붙인다 (언어 전환 시 재계산 회피).
    """
    ratio = contrast_ratio(candidate, against)
    grade = grade_of(ratio)
    if grade is None:          # 3:1 미만이면 어떤 용도로도 사용 불가
        return None
    # 두 색 모두 색약 시뮬레이션을 적용한 뒤 거리를 재측정 (이것이 "재검증"의 핵심)
    sim_dist = delta_e(simulate_hex(candidate, cvd_type), simulate_hex(against, cvd_type))
    if sim_dist < config.CONFUSION_WARN:   # 시뮬레이션 후에도 구분이 애매하면 탈락
        return None
    return {
        "hex": candidate,
        "ratio": round(ratio, 2),
        "grade": grade,
        # reason은 lang 의존이므로 core에 넣지 않음. localizer가 채운다.
        "distance_simulated": round(sim_dist, 3),
    }


def recommend(current: str, against: str, cvd_type: str, limit: int = 3) -> dict:
    """(한국어) 현재 색(current)을 상대 색(against)과 구분되도록 바꿔줄 후보를 찾는다.

    lang 의존 문구(reason, non_color_tips)는 localizer에서 덧붙인다 (언어 전환 시 재계산 회피).
    """
    base = hex_to_oklab(current)   # 현재 색을 OKLab 좌표로 변환 (L, a, b). L은 0~1 범위.
    seen: set[str] = set()          # 이미 시도한 후보 색 중복 방지
    passed: list[dict] = []         # 재검증을 통과한 후보 목록
    # L(밝기)을 0.02씩 어둡게(-)/밝게(+) 이동하며 0~1 범위에서 후보 생성
    for step in np.arange(0.02, 1.0, 0.02):
        for sign in (-1, 1):
            lab = base.copy()
            # a, b(색조)는 그대로 두고 L만 변경 → 원래 색과 비슷한 색조 유지
            lab[0] = float(np.clip(base[0] + sign * step, 0.0, 1.0))
            cand = oklab_to_hex(lab)
            if cand in seen or cand == current.upper():
                continue
            seen.add(cand)
            info = verify(cand, against, cvd_type)   # 후보마다 재검증 수행
            if info:
                info["distance_from_current"] = round(delta_e(cand, current), 3)  # 원래 색과의 변경량
                passed.append(info)

    # Prefer the best grade per closeness: take closest candidates, keep grade variety.
    # (한국어) 원래 색에 가장 가까운(변경량이 작은) 후보를 우선하되, 각 등급별로 1개씩은 포함.
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
        "candidates": picked[:limit],                      # 최대 3개까지 반환 (reason은 localizer가 채움)
        # non_color_tips는 lang 의존이므로 core에 넣지 않음. localizer가 채운다.
    }


def localize_recommendation(rec: dict, lang: str = "ko") -> dict:
    """(한국어) lang 무관 추천 코어에 lang 의존 문구(reason, non_color_tips)를 덧붙여 응답용으로 반환.

    코어는 캐시되고 언어 전환 시 이 함수만 다시 실행되므로, 추천 색 후보 재계산 없이
    문구만 즉시 전환된다 (방안 A' — 언어 전환 2배 지연 회피).
    """
    out = dict(rec)
    out["candidates"] = [
        {**c, "reason": texts.GRADE_REASON[c["grade"]][lang]}
        for c in rec.get("candidates", [])
    ]
    out["non_color_tips"] = [tip[lang] for tip in texts.NON_COLOR_TIPS]
    return out
