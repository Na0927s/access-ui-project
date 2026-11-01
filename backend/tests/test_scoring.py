"""(한국어 요약) 접근성 점수(scoring) 단위 테스트.

검증 대상: calculate_score
- 100점에서 시작해 발견된 문제 심각도별 감점
- 대비율 FAIL(-15) > 색상혼동 FAIL(-10) > 대비율 WARNING(-5) > 색상혼동 WARNING(-4)
- 0~100 범위 제한
- 빈 입력(문제 없음)은 100점

규칙 10(핵심 알고리즘은 테스트 없이 수정 금지) — 점수 공식은 현재 draft(TBD)이지만,
현재 동작을 고정해 두어야 팀이 튜닝할 때 의도한 변경인지 회귀인지 구분할 수 있다.
"""
from app.services.scoring import calculate_score


def test_no_issues_is_perfect_score():
    # 문제가 하나도 없으면 100점
    assert calculate_score([], []) == 100


def test_single_contrast_fail():
    # 대비율 FAIL 1건 = -15 → 85점
    assert calculate_score(["FAIL"], []) == 85


def test_single_contrast_warning():
    # 대비율 WARNING 1건 = -5 → 95점
    assert calculate_score(["WARNING"], []) == 95


def test_single_confusion_fail():
    # 색상 혼동 FAIL 1건 = -10 → 90점
    assert calculate_score([], ["FAIL"]) == 90


def test_single_confusion_warning():
    # 색상 혼동 WARNING 1건 = -4 → 96점
    assert calculate_score([], ["WARNING"]) == 96


def test_contrast_fail_deducts_more_than_confusion_fail():
    # 대비율 FAIL(-15)이 색상 혼동 FAIL(-10)보다 감점이 커야 함 (텍스트 가독성이 더 치명적)
    assert calculate_score(["FAIL"], []) < calculate_score([], ["FAIL"])


def test_multiple_issues_accumulate():
    # 대비율 FAIL 2 + 색상혼동 FAIL 1 + 대비율 WARNING 1 = -30 -10 -5 = -45 → 55점
    assert calculate_score(["FAIL", "FAIL", "WARNING"], ["FAIL"]) == 55


def test_floor_at_zero():
    # 감점이 100을 초과해도 0점 아래로 내려가지 않음
    score = calculate_score(["FAIL"] * 10, ["FAIL"] * 10)  # -150 -100 = -250
    assert score == 0


def test_ceiling_at_hundred():
    # PASS는 감점 0 → 100점 유지
    assert calculate_score(["PASS", "PASS"], ["PASS"]) == 100


def test_score_always_in_range():
    # 임의 조합에도 항상 0~100 범위
    import random
    random.seed(42)
    verdicts = ["PASS", "WARNING", "FAIL"]
    for _ in range(50):
        c = [random.choice(verdicts) for _ in range(random.randint(0, 8))]
        f = [random.choice(verdicts) for _ in range(random.randint(0, 8))]
        s = calculate_score(c, f)
        assert 0 <= s <= 100


def test_many_failures_clamped_to_zero():
    # 대비율 FAIL만 7개면 -105 → 0점
    assert calculate_score(["FAIL"] * 7, []) == 0
