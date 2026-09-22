"""Color conversions: HEX <-> sRGB <-> linear RGB <-> CIELAB, and Delta E (CIE76)."""
import re

import numpy as np

HEX_RE = re.compile(r"^#?[0-9a-fA-F]{6}$")

# sRGB linear -> XYZ (D65) and inverse
_XYZ_M = np.array([
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.0721750],
    [0.0193339, 0.1191920, 0.9503041],
])
_XYZ_M_INV = np.array([
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660, 1.8760108, 0.0415560],
    [0.0556434, -0.2040259, 1.0572252],
])
_WHITE_D65 = np.array([0.95047, 1.0, 1.08883])
_DELTA = 6 / 29


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    if not HEX_RE.match(hex_str):
        raise ValueError(f"invalid hex color: {hex_str}")
    h = hex_str.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(rgb) -> str:
    r, g, b = (int(round(max(0, min(255, c)))) for c in rgb)
    return f"#{r:02X}{g:02X}{b:02X}"


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    """c in [0,1]."""
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c: np.ndarray) -> np.ndarray:
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def _f(t: np.ndarray) -> np.ndarray:
    return np.where(t > _DELTA ** 3, np.cbrt(t), t / (3 * _DELTA ** 2) + 4 / 29)


def _f_inv(t: np.ndarray) -> np.ndarray:
    return np.where(t > _DELTA, t ** 3, 3 * _DELTA ** 2 * (t - 4 / 29))


def linear_to_cielab(lin: np.ndarray) -> np.ndarray:
    xyz = lin @ _XYZ_M.T / _WHITE_D65
    fx, fy, fz = _f(xyz[..., 0]), _f(xyz[..., 1]), _f(xyz[..., 2])
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=-1)


def cielab_to_linear(lab: np.ndarray) -> np.ndarray:
    lab = np.asarray(lab, dtype=float)
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    xyz = np.stack([_f_inv(fx), _f_inv(fy), _f_inv(fz)], axis=-1) * _WHITE_D65
    return xyz @ _XYZ_M_INV.T


def hex_to_cielab(hex_str: str) -> np.ndarray:
    rgb = np.array(hex_to_rgb(hex_str), dtype=float) / 255.0
    return linear_to_cielab(srgb_to_linear(rgb))


def cielab_to_hex(lab: np.ndarray) -> str:
    srgb = linear_to_srgb(cielab_to_linear(lab))
    return rgb_to_hex(srgb * 255.0)


def delta_e(hex_a: str, hex_b: str) -> float:
    """Delta E (CIE76): Euclidean distance in CIELAB (L*, a*, b*)."""
    return float(np.linalg.norm(hex_to_cielab(hex_a) - hex_to_cielab(hex_b)))
