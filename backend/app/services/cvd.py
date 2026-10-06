"""Color vision deficiency simulation (Machado, Oliveira & Fernandes, 2009, severity 1.0).

Matrices are applied in linear RGB. Verify values against the original paper.

(한국어 요약) 색각이상(색약) 시뮬레이션 핵심 모듈.
- Machado(2009) 연구의 3x3 변환 행렬로 원본 이미지를 색약 사용자가 보는 화면으로 변환
- 핵심 원리: sRGB → 선형 RGB 변환 후 행렬 곱 → 다시 sRGB로 복원
- protan=적색약, deutan=녹색약, tritan=청색약
"""
from typing import Literal

import numpy as np
from PIL import Image

from .color import hex_to_rgb, linear_to_srgb, rgb_to_hex, srgb_to_linear

CvdType = Literal["protan", "deutan", "tritan"]

# 유형별 시뮬레이션 행렬 (Machado 2009, severity 1.0 = 전경도 기준).
# 각 행렬은 "정상 시각의 선형 RGB"를 "해당 색약이 지각하는 선형 RGB"로 바꿔줌.
# 행렬 값이 미리 정해져 있어 매우 빠르고, 기기·이미지 크기와 무관하게 동일한 결과를 냄.
MATRICES: dict[str, np.ndarray] = {
    "protan": np.array([   # 적색약: 빨강에 민감한 L-원뿔 세포 기능 저하
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
    ]),
    "deutan": np.array([   # 녹색약: 초록에 민감한 M-원뿔 세포 기능 저하 (가장 흔한 유형)
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.011820, 0.042940, 0.968881],
    ]),
    "tritan": np.array([   # 청색약: 파랑에 민감한 S-원뿔 세포 기능 저하 (매우 드묾)
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.303900],
    ]),
}

# CVD display labels (ko/en) live in services/texts.py.


def simulate_array(rgb01: np.ndarray, cvd_type: str) -> np.ndarray:
    """rgb01: float array (..., 3) in [0,1] sRGB. Returns sRGB in [0,1].

    (한국어) 픽셀 배열 전체에 시뮬레이션 적용. 이미지·단일 색상 모두 이 함수를 공유.
    """
    m = MATRICES[cvd_type]
    lin = srgb_to_linear(rgb01)               # 1) 감마 보정된 sRGB를 빛의 세기에 비례하는 선형 RGB로
    out = np.clip(lin @ m.T, 0.0, 1.0)        # 2) 색약 행렬을 곱해 색을 섞음 (범위 밖 값은 잘라내기)
    return linear_to_srgb(out)                # 3) 모니터 표시를 위해 다시 sRGB 감마로 복원


def simulate_hex(hex_str: str, cvd_type: str) -> str:
    # 단일 HEX 색상 하나를 시뮬레이션 — 색상 쌍의 구분 가능성 검사(delta_e)에 사용됨
    rgb = np.array(hex_to_rgb(hex_str), dtype=float) / 255.0
    return rgb_to_hex(simulate_array(rgb, cvd_type) * 255.0)


def simulate_image(img: Image.Image, cvd_type: str) -> Image.Image:
    """Simulate a whole image; alpha channel is preserved.

    (한국어) Pillow 이미지 전체를 시뮬레이션. 투명도(alpha) 채널은 그대로 유지.
    """
    # 투명도가 있는 이미지인지 확인 (RGBA/LA 모드 또는 팔레트 투명도)
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    src = img.convert("RGBA" if has_alpha else "RGB")
    # 이미지를 0~1 실수 배열로 변환 ( NumPy 연산을 위해)
    arr = np.asarray(src, dtype=np.float64) / 255.0
    # 앞의 3채널(RGB)만 변환하고, alpha는 나중에 다시 붙임
    rgb = simulate_array(arr[..., :3], cvd_type)
    out = np.round(rgb * 255.0).astype(np.uint8)
    if has_alpha:
        # alpha 채널을 변환 없이 그대로 합쳐서 RGBA 이미지로 복원
        alpha = np.round(arr[..., 3:4] * 255.0).astype(np.uint8)
        return Image.fromarray(np.concatenate([out, alpha], axis=-1), "RGBA")
    return Image.fromarray(out, "RGB")
