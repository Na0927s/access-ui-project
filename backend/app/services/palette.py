"""Dominant color extraction with Pillow median-cut quantization.

(한국어 요약) 업로드한 이미지에서 주요 색상(팔레트)을 추출하는 모듈.
- Pillow의 median-cut 양자화로 이미지를 대표색 16개로 축소 → 비슷한 색 병합 → 상위 N개 선택
- 추출된 팔레트는 대비 검사(가장 많은 색 = 배경으로 가정)와 색상 혼동 검사의 입력이 됨
"""
from PIL import Image

from .. import config
from .color import delta_e, rgb_to_hex


def flatten_on_white(img: Image.Image) -> Image.Image:
    """Composite transparent pixels onto white; returns RGB.

    (한국어) 투명한 부분을 흰 배경 위에 합성해 RGB 이미지로 만듦.
    PNG 등 투명도가 있는 이미지의 실제 화면 색(흰 배경 위에 보이는 색)을 계산하기 위함.
    """
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))   # 흰색 배경 준비
        return Image.alpha_composite(bg, rgba).convert("RGB")      # 배경 위에 이미지 합성
    return img.convert("RGB")


def resize_max_side(img: Image.Image, max_side: int) -> Image.Image:
    # 가로·세도 중 긴 쪽이 max_side가 되도록 비율 유지 축소 (확대는 하지 않음)
    w, h = img.size
    scale = max_side / max(w, h)
    if scale >= 1:
        return img
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)


def extract_palette(img: Image.Image) -> list[dict]:
    """Returns [{"hex": "#RRGGBB", "ratio": float}] sorted by ratio desc.

    (한국어) 이미지의 주요 색상을 [{hex, 비율}] 목록으로 반환 (비율 내림차순 정렬).
    처리 순서: 축소 → 16색 양자화 → 비슷한 색 병합 → 미세 색 제거 → 상위 8개.
    """
    # 성능을 위해 400px로 축소한 뒤 처리 (색 분포는 거의 동일하게 유지됨)
    small = resize_max_side(flatten_on_white(img), config.PALETTE_MAX_SIDE)
    # median-cut 방식으로 이미지를 대표색 16개로 양자화
    q = small.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette() or []   # 색상 인덱스 -> RGB 값 대응표
    counts = q.getcolors() or []  # [(픽셀 수, 색상 인덱스), ...] 목록
    total = sum(c for c, _ in counts) or 1  # 전체 픽셀 수 (0으로 나누기 방지)

    colors: list[dict] = []
    for count, idx in sorted(counts, reverse=True):  # 픽셀 수가 많은 색부터 처리
        rgb = pal[idx * 3: idx * 3 + 3]             # 팔레트표에서 인덱스로 RGB 조회
        hex_c = rgb_to_hex(rgb)
        ratio = count / total                        # 화면에서 차지하는 비율
        # 이미 수집한 색 중 ΔE 3 미만(거의 같은 색)이 있으면 새 색상 추가 대신 비율만 합침
        merged = False
        for c in colors:
            if delta_e(c["hex"], hex_c) < config.PALETTE_MERGE_DISTANCE:
                c["ratio"] += ratio
                merged = True
                break
        if not merged:
            colors.append({"hex": hex_c, "ratio": ratio})

    colors = [c for c in colors if c["ratio"] >= config.PALETTE_MIN_RATIO]  # 노이즈 색 제거
    colors.sort(key=lambda c: c["ratio"], reverse=True)                   # 비율 내림차순 정렬
    colors = colors[: config.PALETTE_MAX_COLORS]                          # 상위 8개만 유지
    for c in colors:
        c["ratio"] = round(c["ratio"], 4)  # 응답 크기를 줄이기 위해 소수 4자리로 반올림
    return colors
