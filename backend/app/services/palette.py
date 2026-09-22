"""Dominant color extraction with Pillow median-cut quantization."""
from PIL import Image

from .. import config
from .color import delta_e, rgb_to_hex


def flatten_on_white(img: Image.Image) -> Image.Image:
    """Composite transparent pixels onto white; returns RGB."""
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        return Image.alpha_composite(bg, rgba).convert("RGB")
    return img.convert("RGB")


def resize_max_side(img: Image.Image, max_side: int) -> Image.Image:
    w, h = img.size
    scale = max_side / max(w, h)
    if scale >= 1:
        return img
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)


def extract_palette(img: Image.Image) -> list[dict]:
    """Returns [{"hex": "#RRGGBB", "ratio": float}] sorted by ratio desc."""
    small = resize_max_side(flatten_on_white(img), config.PALETTE_MAX_SIDE)
    q = small.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette() or []
    counts = q.getcolors() or []
    total = sum(c for c, _ in counts) or 1

    colors: list[dict] = []
    for count, idx in sorted(counts, reverse=True):
        rgb = pal[idx * 3: idx * 3 + 3]
        hex_c = rgb_to_hex(rgb)
        ratio = count / total
        merged = False
        for c in colors:
            if delta_e(c["hex"], hex_c) < config.PALETTE_MERGE_DISTANCE:
                c["ratio"] += ratio
                merged = True
                break
        if not merged:
            colors.append({"hex": hex_c, "ratio": ratio})

    colors = [c for c in colors if c["ratio"] >= config.PALETTE_MIN_RATIO]
    colors.sort(key=lambda c: c["ratio"], reverse=True)
    colors = colors[: config.PALETTE_MAX_COLORS]
    for c in colors:
        c["ratio"] = round(c["ratio"], 4)
    return colors
