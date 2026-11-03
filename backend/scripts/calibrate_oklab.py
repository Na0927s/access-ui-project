"""Calibration script: measure real OKLab distances for key color pairs.

(한국어 요약) OKLab 전환 후 임계값(DISTINCT_MIN, CONFUSION_FAIL/WARN, PALETTE_MERGE_DISTANCE)을
실측값 기반으로 정하기 위한 일회성 측정 스크립트. 테스트 대상 색 쌍들의 원본/시뮬레이션 후
OKLab 거리를 출력한다. 측정 결과는 config.py 주석에 기록한다.
"""
from app.services.color import delta_e, hex_to_oklab, oklab_to_hex
from app.services.cvd import simulate_hex

RED, GREEN = "#EF4444", "#22C55E"
WHITE, BLACK = "#FFFFFF", "#000000"
# 실제 UI에서 자주 쓰이는 문제 색쌍들
PAIRS = [
    ("빨강/초록(상태색)", RED, GREEN),
    ("빨강/흰(버튼)", "#FF0000", "#FFFFFF"),
    ("#BEBDBD/흰(대비부족)", "#BEBDBD", "#FFFFFF"),
    ("진파랑/파랑(명암)", "#1E3A8A", "#3B82F6"),
    ("주황/빨강(인접색조)", "#F97316", "#EF4444"),
    ("파랑/노랑(보색)", "#0000FF", "#FFFF00"),
    ("회색/흰(거의 같음)", "#F0F0F0", "#FFFFFF"),
    ("검정/흰(최대대비)", BLACK, WHITE),
]


def show(label, a, b):
    orig = delta_e(a, b)
    print(f"\n[{label}] {a} vs {b}")
    print(f"  원본 OKLab 거리: {orig:.4f}")
    for cvd in ("protan", "deutan", "tritan"):
        sa = simulate_hex(a, cvd)
        sb = simulate_hex(b, cvd)
        d = delta_e(sa, sb)
        ratio = d / orig if orig > 0 else 0
        print(f"  {cvd:7s} 시뮬레이션 후: {d:.4f}  (북괴율 {ratio:.2%}, 잔여/원본)")


def show_oklab_values():
    print("=== 기준색 OKLab 값 (L, a, b) ===")
    for name, c in [("흰", WHITE), ("검정", BLACK), ("빨강", RED), ("초록", GREEN)]:
        lab = hex_to_oklab(c)
        print(f"  {name} {c}: L={lab[0]:.4f} a={lab[1]:.4f} b={lab[2]:.4f}")


def show_roundtrip():
    print("=== OKLab 왕복 변환 검증 ===")
    for c in (WHITE, BLACK, RED, GREEN, "#4F46E5", "#767676"):
        rt = oklab_to_hex(hex_to_oklab(c))
        print(f"  {c} -> {rt}  {'OK' if rt == c else 'MISMATCH'}")


if __name__ == "__main__":
    show_oklab_values()
    show_roundtrip()
    print("\n=== 색상쌍별 OKLab 거리 ===")
    for label, a, b in PAIRS:
        show(label, a, b)

    # 팔레트 병합 기준 참고: 비슷한 색들이 OKLab에서 얼마나 떨어져 있는지
    print("\n=== 팔레트 병합 기준 참고 ===")
    merge_examples = [
        ("거의 같은 회색", "#808080", "#828282"),
        ("살짝 다른 빨강", "#EF4444", "#F04444"),
        ("명확히 다른 색", "#EF4444", "#22C55E"),
    ]
    for label, a, b in merge_examples:
        print(f"  {label}: {a}/{b} = {delta_e(a, b):.4f}")
