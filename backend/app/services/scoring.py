"""Accessibility score (draft formula — TBD by the team). Not an official WCAG score.

(한국어 요약) 접근성 점수(0~100) 계산 — 프로젝트 규칙 7번에 따라 "자체 지표"임을 명시.
- 100점에서 시작해 발견된 문제의 심각도에 따라 감점하는 방식
- 대비율 실패(FAIL)는 색상 혼동 실패보다 감점이 큼 (텍스트 가독성이 더 치명적이므로)
"""
def calculate_score(contrast_verdicts: list[str], confusion_verdicts: list[str]) -> int:
    score = 100
    score -= 15 * contrast_verdicts.count("FAIL")      # 대비율 FAIL 1건당 -15점
    score -= 5 * contrast_verdicts.count("WARNING")    # 대비율 WARNING 1건당 -5점
    score -= 10 * confusion_verdicts.count("FAIL")     # 색상 혼동 FAIL 1건당 -10점
    score -= 4 * confusion_verdicts.count("WARNING")   # 색상 혼동 WARNING 1건당 -4점
    return max(0, min(100, score))                      # 최종 점수는 0~100 범위로 제한
