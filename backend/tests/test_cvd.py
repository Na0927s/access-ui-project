"""(한국어 요약) 색각이상 시뮬레이션(cvd)과 색 변환(color)의 단위 테스트.
- 시뮬레이션이 알려진 성질(흰색/검정 유지, 색약별 빨강-초록 혼동)을 지키는지 검증
- 프로젝트 규칙 10번: 핵심 알고리즘은 이 테스트를 통과해야 수정 가능
"""
import numpy as np
from PIL import Image

from app.services.color import delta_e, hex_to_oklab, oklab_to_hex
from app.services.cvd import simulate_hex, simulate_image

TYPES = ("protan", "deutan", "tritan")
RED, GREEN = "#EF4444", "#22C55E"   # 테스트용 빨강/초록 샘플


def _channel_diff(a: str, b: str) -> int:
    # 두 HEX 색의 R/G/B 채널별 차이 중 최댓값 (반올림 오차 허용 범위 비교용)
    return max(abs(int(a[i:i + 2], 16) - int(b[i:i + 2], 16)) for i in (1, 3, 5))


def test_white_and_black_unchanged():
    # 흰색과 검정은 어떤 색약에서도 변하면 안 됨 (행렬의 기본 성질)
    for t in TYPES:
        assert _channel_diff(simulate_hex("#FFFFFF", t), "#FFFFFF") <= 1
        assert _channel_diff(simulate_hex("#000000", t), "#000000") <= 1


def test_red_green_become_confusable_for_protan_deutan():
    # 빨강/초록의 원본 거리
    original = delta_e(RED, GREEN)
    # Deutan: hue difference nearly vanishes.
    # (한국어) 녹색약에서는 빨강-초록의 색조 차이가 거의 사라져야 함
    deutan = delta_e(simulate_hex(RED, "deutan"), simulate_hex(GREEN, "deutan"))
    assert deutan < original * 0.3
    # Protan: red is perceived darker, so a lightness gap remains, but distance still drops.
    # (한국어) 적색약은 빨강이 어둡게 느껴져 밝기 차이가 남 — 그래도 거리는 줄어야 함
    protan = delta_e(simulate_hex(RED, "protan"), simulate_hex(GREEN, "protan"))
    assert protan < original * 0.8


def test_tritan_keeps_red_green_distinct():
    # 청색약은 빨강-초록 축에 영향을 주지 않으므로 두 색이 여전히 명확히 구분되어야 함
    original = delta_e(RED, GREEN)
    tritan = delta_e(simulate_hex(RED, "tritan"), simulate_hex(GREEN, "tritan"))
    # Tritan preserves the red-green axis: distance should barely drop.
    # (한국어) 청색약은 빨강-초록 거리를 거의 유지해야 함 (OKLab 거리 비율로 검증)
    assert tritan > original * 0.7


def test_image_size_and_alpha_preserved():
    # 이미지 단위 시뮬레이션이 크기와 투명도(alpha) 채널을 그대로 보존하는지 확인
    img = Image.new("RGBA", (40, 30), (255, 0, 0, 128))
    for t in TYPES:
        out = simulate_image(img, t)
        assert out.size == (40, 30)
        assert out.mode == "RGBA"
        assert np.asarray(out)[0, 0, 3] == 128


def test_oklab_roundtrip():
    # HEX → OKLab → HEX 변환을 왕복하면 원래 색으로 정확히 돌아와야 함 (역변환 검증)
    for c in ("#FFFFFF", "#000000", "#EF4444", "#22C55E", "#4F46E5", "#767676"):
        assert oklab_to_hex(hex_to_oklab(c)) == c
    # OKLab 정의상 흰색의 L은 1.0, 검정의 L은 0.
    # (한국어) OKLab에서 흰색의 L=1.0, 검정의 L=0
    assert abs(hex_to_oklab("#FFFFFF")[0] - 1.0) < 1e-6
    assert abs(hex_to_oklab("#000000")[0]) < 1e-6

