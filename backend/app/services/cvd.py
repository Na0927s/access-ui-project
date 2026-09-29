"""Color vision deficiency simulation (Machado, Oliveira & Fernandes, 2009, severity 1.0).

Matrices are applied in linear RGB. Verify values against the original paper.
"""
from typing import Literal

import numpy as np
from PIL import Image

from .color import hex_to_rgb, linear_to_srgb, rgb_to_hex, srgb_to_linear

CvdType = Literal["protan", "deutan", "tritan"]

MATRICES: dict[str, np.ndarray] = {
    "protan": np.array([
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
    ]),
    "deutan": np.array([
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.011820, 0.042940, 0.968881],
    ]),
    "tritan": np.array([
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.303900],
    ]),
}

# CVD display labels (ko/en) live in services/texts.py.


def simulate_array(rgb01: np.ndarray, cvd_type: str) -> np.ndarray:
    """rgb01: float array (..., 3) in [0,1] sRGB. Returns sRGB in [0,1]."""
    m = MATRICES[cvd_type]
    lin = srgb_to_linear(rgb01)
    out = np.clip(lin @ m.T, 0.0, 1.0)
    return linear_to_srgb(out)


def simulate_hex(hex_str: str, cvd_type: str) -> str:
    rgb = np.array(hex_to_rgb(hex_str), dtype=float) / 255.0
    return rgb_to_hex(simulate_array(rgb, cvd_type) * 255.0)


def simulate_image(img: Image.Image, cvd_type: str) -> Image.Image:
    """Simulate a whole image; alpha channel is preserved."""
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    src = img.convert("RGBA" if has_alpha else "RGB")
    arr = np.asarray(src, dtype=np.float64) / 255.0
    rgb = simulate_array(arr[..., :3], cvd_type)
    out = np.round(rgb * 255.0).astype(np.uint8)
    if has_alpha:
        alpha = np.round(arr[..., 3:4] * 255.0).astype(np.uint8)
        return Image.fromarray(np.concatenate([out, alpha], axis=-1), "RGBA")
    return Image.fromarray(out, "RGB")
