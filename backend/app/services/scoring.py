"""Accessibility score (in-house metric) and overall verdict mapping.

(한국어 요약) 접근성 점수(0~100) 계산 + 점수 구간 기반 전체 판정 — 규칙 7번에 따라 "자체 지표"임을 명시.
- 100점에서 시작해 발견된 문제의 심각도에 따라 감점하는 방식
- 대비율 실패(FAIL)는 색상 혼동 실패보다 감점이 큼 (텍스트 가독성이 더 치명적이므로)
- 전체 판정은 점수 구간으로 산출: 90점↑ PASS, 70~89점 WARNING, 70점 미만 FAIL
  (이전엔 "이슈 1개라도 있으면 FAIL" 이분법이라 점수 95점인데 FAIL이 되는 모순이 있었음)
"""
from .. import config


def calculate_score(contrast_verdicts: list[str], confusion_verdicts: list[str]) -> int:
    score = 100
    score -= 15 * contrast_verdicts.count("FAIL")      # 대비율 FAIL 1건당 -15점
    score -= 5 * contrast_verdicts.count("WARNING")    # 대비율 WARNING 1건당 -5점
    score -= 10 * confusion_verdicts.count("FAIL")     # 색상 혼동 FAIL 1건당 -10점
    score -= 4 * confusion_verdicts.count("WARNING")   # 색상 혼동 WARNING 1건당 -4점
    return max(0, min(100, score))                      # 최종 점수는 0~100 범위로 제한


def score_to_verdict(score: int) -> str:
    """Map a 0–100 score to an overall verdict (PASS / WARNING / FAIL).

    (한국어) 점수를 전체 판정으로 변환. 점수와 판정이 일치하도록 구간 기반.
    - 90점 이상: PASS (가벼운 이슈만 있거나 없음)
    - 70~89점: WARNING (일부 구분 어려움)
    - 70점 미만: FAIL (심각하거나 다수의 이슈)
    """
    if score >= config.VERDICT_PASS_SCORE:
        return "PASS"
    if score >= config.VERDICT_WARN_SCORE:
        return "WARNING"
    return "FAIL"
