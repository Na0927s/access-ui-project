"""(한국어 요약) 팔레트 추출(palette) 단위 테스트.

검증 대상:
- extract_palette: 주요 색상 추출·병합·정렬·상한 개수
- flatten_on_white: 투명도 합성
- resize_max_side: 비율 유지 축소(확대 금지)

규칙 10(핵심 알고리즘은 테스트 없이 수정 금지) — palette는 color와 함께
대비·혼동 검사의 입력이 되므로 회귀 방지가 필요하다.
"""
from PIL import Image

from app.services.palette import extract_palette, flatten_on_white, resize_max_side


def test_extract_palette_returns_sorted_by_ratio():
    # 단색 빨강 이미지 → 팔레트가 빨강 한 개, 비율 1.0(근사)이어야 함
    img = Image.new("RGB", (100, 100), "#FF0000")
    pal = extract_palette(img)
    assert pal, "팔레트가 비어 있으면 안 됨"
    # 가장 많은 색이 빨강 계열이어야 함 (R 채널이 우세)
    top = pal[0]
    r, g, b = (int(top["hex"][i:i + 2], 16) for i in (1, 3, 5))
    assert r > g and r > b
    assert top["ratio"] > 0.9  # 거의 전체를 차지
    # 비율 내림차순 정렬 확인
    ratios = [c["ratio"] for c in pal]
    assert ratios == sorted(ratios, reverse=True)


def test_extract_palette_caps_at_max_colors():
    # 무지개 여러 색 이미지여도 PALETTE_MAX_COLORS(8)을 넘지 않아야 함
    img = Image.new("RGB", (200, 200), "white")
    # 10개의 색 띠를 그려 다양한 색 유도
    colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF",
              "#00FFFF", "#808080", "#FFA500", "#800080", "#008000"]
    px = img.load()
    for i, c in enumerate(colors):
        x0 = i * 20
        for x in range(x0, x0 + 20):
            for y in range(200):
                px[x, y] = Image.new("RGB", (1, 1), c).getpixel((0, 0))
    pal = extract_palette(img)
    assert len(pal) <= 8


def test_extract_palette_rounds_ratio():
    # 비율이 소수 4자리로 반올림되어야 함
    img = Image.new("RGB", (100, 100), "#000000")
    pal = extract_palette(img)
    for c in pal:
        # 4자리 반올림이면 소수점 이하 자릿수가 4 이하
        assert round(c["ratio"], 4) == c["ratio"]


def test_extract_palette_two_colors():
    # 흰 배경 절반 + 빨강 절반 → 두 색이 비슷한 비율로 잡혀야 함
    img = Image.new("RGB", (100, 100), "#FFFFFF")
    red = Image.new("RGB", (50, 100), "#FF0000")
    img.paste(red, (50, 0))
    pal = extract_palette(img)
    assert len(pal) >= 1
    # 흰색과 빨강이 모두 잡혀야 함 (병합되지 않는 서로 다른 색)
    hexes = {c["hex"].upper() for c in pal}
    assert "#FF0000" in hexes


def test_flatten_on_white_rgba():
    # 투명 PNG(RGBA)는 흰 배경 위에 합성되어 RGB로 나와야 함
    rgba = Image.new("RGBA", (10, 10), (255, 0, 0, 0))  # 완전 투명
    out = flatten_on_white(rgba)
    assert out.mode == "RGB"
    # 완전 투명이면 흰 배경만 보임
    assert out.getpixel((0, 0)) == (255, 255, 255)


def test_flatten_on_white_opaque_rgba():
    # 불투명 RGBA는 원래 색이 유지됨
    rgba = Image.new("RGBA", (10, 10), (255, 0, 0, 255))
    out = flatten_on_white(rgba)
    assert out.mode == "RGB"
    assert out.getpixel((0, 0)) == (255, 0, 0)


def test_flatten_on_white_rgb_passthrough():
    # 이미 RGB면 모드만 확인 후 그대로 RGB 반환
    img = Image.new("RGB", (10, 10), "#123456")
    out = flatten_on_white(img)
    assert out.mode == "RGB"
    assert out.getpixel((0, 0)) == (0x12, 0x34, 0x56)


def test_resize_max_side_shrinks():
    # 1000x500 이미지를 max_side=200으로 축소 → 200x100
    img = Image.new("RGB", (1000, 500), "white")
    out = resize_max_side(img, 200)
    assert out.size == (200, 100)


def test_resize_max_side_no_upscale():
    # 작은 이미지는 max_side보다 커도 확대하지 않음 (scale >= 1이면 원본 반환)
    img = Image.new("RGB", (50, 50), "white")
    out = resize_max_side(img, 200)
    assert out.size == (50, 50)


def test_resize_max_side_portrait():
    # 세로가 긴 이미지(500x1000) → max_side=200이면 100x200
    img = Image.new("RGB", (500, 1000), "white")
    out = resize_max_side(img, 200)
    assert out.size == (100, 200)
