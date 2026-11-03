"""Threshold tuning & validation for OKLab confusion detection.

(한국어 요약) OKLab 전환 후 색상 혼동 판정 임계값을 검증·튜닝하는 스크립트.
다양한 실제 UI 색상 쌍에 대해 원본/시뮬레이션 후 OKLab 거리를 측정하고,
사람이 사전 분류한 기대 판정(expect)과 현재 알고리즘 판정(actual)을 비교한다.
기대 판정은 WCAG/Machado 알려진 성질 + 일반적인 색각이상 지식 기준.

실행: cd backend && PYTHONPATH=. python scripts/tune_thresholds.py
"""
from app.services.analyzer import confusion_verdict
from app.services.color import delta_e
from app.services.cvd import simulate_hex

# 검증용 색상 쌍. expect는 "사람이 볼 때 색각이상 환경에서 이 쌍이 어떤 상태여야 하는가".
# PASS = 명확 구분, WARNING = 애매, FAIL = 사실상 동일, EXCLUDE = 원래부터 비슷한 색(판정 제외).
# 각 쌍은 실제 UI에서 자주 쓰이는 조합.
CASES = [
    # (설명, 색A, 색B, cvd, expect)
    # --- 빨강/초록 상태색: deutan/protan에서 혼동되어야 함 (핵심 케이스) ---
    ("빨강/초록 상태색 (deutan)", "#EF4444", "#22C55E", "deutan", "WARNING"),
    # protan은 빨강을 어둡게 지각해 명도차가 남 → 잔여 0.24로 명도로 구분 가능 (PASS)
    ("빨강/초록 상태색 (protan)", "#EF4444", "#22C55E", "protan", "PASS"),
    # tritan은 빨강/초록 보존 → PASS
    ("빨강/초록 상태색 (tritan)", "#EF4444", "#22C55E", "tritan", "PASS"),
    # --- 순색 빨강/초록: 현실 UI에 거의 안 쓰이는 극단 케이스, sim후 0.22로 PASS ---
    ("순색 빨강/초록 (deutan)", "#FF0000", "#00FF00", "deutan", "PASS"),
    # --- 파랑/노랑 보색: 색각이상에서도 잔여 큼 → PASS ---
    ("파랑/노랑 (deutan)", "#0000FF", "#FFFF00", "deutan", "PASS"),
    ("파랑/노랑 (tritan)", "#0000FF", "#FFFF00", "tritan", "PASS"),
    # --- 명암만 다른 같은 색조: 색약과 무관하게 명암 차이 유지 ---
    ("진파랑/파랑 명암 (deutan)", "#1E3A8A", "#3B82F6", "deutan", "PASS"),
    ("진회색/밝은회색 (deutan)", "#374151", "#9CA3AF", "deutan", "PASS"),
    # --- 원래부터 거의 같은 색: 판정 제외 ---
    ("거의 같은 회색 (deutan)", "#808080", "#828282", "deutan", "EXCLUDE"),
    ("거의 같은 빨강 (deutan)", "#EF4444", "#F04444", "deutan", "EXCLUDE"),
    # --- 대비 부족 쌍 (색약 무관) ---
    ("연회색/흰 대비부족 (deutan)", "#BEBDBD", "#FFFFFF", "deutan", "PASS"),
    # --- 주황/빨강 인접색조: deutan에서 애매할 수 있음 ---
    ("주황/빨강 (deutan)", "#F97316", "#EF4444", "deutan", "WARNING"),
    # --- 성공(초록)/정보(파랑): 보통 구분됨 ---
    ("초록/파랑 (deutan)", "#22C55E", "#3B82F6", "deutan", "PASS"),
    # --- 경고(노랑)/오류(빨강) ---
    ("노랑/빨강 (protan)", "#EAB308", "#EF4444", "protan", "PASS"),
]


def verdict_letter(v):
    # None -> EXCLUDE, 판정 문자 그대로
    return "EXCLUDE" if v is None else v


def run():
    print(f"{'설명':<32} {'원본':>7} {'sim후':>7} {'비율':>6} {'예상':>8} {'실제':>8} {'일치':>4}")
    print("-" * 90)
    matches = 0
    total = len(CASES)
    mismatches = []
    for desc, a, b, cvd, expect in CASES:
        d_orig = delta_e(a, b)
        d_sim = delta_e(simulate_hex(a, cvd), simulate_hex(b, cvd))
        ratio = d_sim / d_orig if d_orig > 0 else 0
        actual = confusion_verdict(d_orig, d_sim)
        actual_l = verdict_letter(actual)
        ok = actual_l == expect
        if ok:
            matches += 1
        else:
            mismatches.append((desc, d_orig, d_sim, ratio, expect, actual_l))
        print(f"{desc:<32} {d_orig:>7.4f} {d_sim:>7.4f} {ratio:>5.0%} {expect:>8} {actual_l:>8} {'OK' if ok else 'X':>4}")
    print("-" * 90)
    print(f"일치: {matches}/{total}  ({matches/total:.0%})")
    if mismatches:
        print("\n불일치 케이스 (임계값 조정 검토 대상):")
        for desc, d_orig, d_sim, ratio, expect, actual in mismatches:
            print(f"  {desc}: orig={d_orig:.4f} sim={d_sim:.4f} ratio={ratio:.0%} 예상={expect} 실제={actual}")


if __name__ == "__main__":
    run()
