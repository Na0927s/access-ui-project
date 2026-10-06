"""Color conversions: HEX <-> sRGB <-> linear RGB <-> CIELAB, and Delta E (CIE76).

(한국어 요약) 색상 표기법 변환과 색상 거리 계산을 담당하는 모듈.
- 웹 색상 표기(HEX)를 과학적 색 공간(CIELAB)으로 변환하는 변환기 모음
- delta_e(): 두 색이 사람 눈에 얼마나 다르게 보이는지 수치화 (0이면 동일, 클수록 명확히 구분)
- 나머지 모듈(wcag, palette, recommend, analyzer)이 모두 이 파일의 함수를 사용함
"""
import re

import numpy as np

# 유효한 HEX 색상 형식 검증용 정규식 (#은 생략 가능)
HEX_RE = re.compile(r"^#?[0-9a-fA-F]{6}$")

# sRGB linear -> XYZ (D65) and inverse
# (한국어) 선형 RGB와 XYZ 색 공간 사이의 변환 행렬 (D65 = 표준 광원, 일반적인 모니터 환경)
_XYZ_M = np.array([
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.0721750],
    [0.0193339, 0.1191920, 0.9503041],
])
_XYZ_M_INV = np.array([  # XYZ -> 선형 RGB 역행렬 (CIELAB 되돌리기에 사용)
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660, 1.8760108, 0.0415560],
    [0.0556434, -0.2040259, 1.0572252],
])
_WHITE_D65 = np.array([0.95047, 1.0, 1.08883])  # 기준 흰색의 XYZ 값
_DELTA = 6 / 29  # CIELAB 변환식의 임계 상수


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    # "#EF4444" -> (239, 68, 68) 처럼 0~255 정수 3개로 변환
    if not HEX_RE.match(hex_str):
        raise ValueError(f"invalid hex color: {hex_str}")
    h = hex_str.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(rgb) -> str:
    # (239, 68, 68) -> "#EF4444". 범위를 벗어난 값은 0~255로 잘라내고 반올림
    r, g, b = (int(round(max(0, min(255, c)))) for c in rgb)
    return f"#{r:02X}{g:02X}{b:02X}"


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    """c in [0,1].

    (한국어) sRGB 감마 보정을 풀어 실제 빛의 세기(선형 값)로 변환.
    어두운 쪽(<= 0.04045)은 단순 비례, 밝은 쪽은 2.4제곱으로 풀어냄.
    """
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c: np.ndarray) -> np.ndarray:
    # 위 변환의 반대: 선형 값을 모니터 표시용 sRGB 감마 값으로 변환
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def _f(t: np.ndarray) -> np.ndarray:
    # XYZ -> CIELAB 변환의 비선형 함수: 어두운 부분을 확장해 사람 지각에 맞춤
    return np.where(t > _DELTA ** 3, np.cbrt(t), t / (3 * _DELTA ** 2) + 4 / 29)


def _f_inv(t: np.ndarray) -> np.ndarray:
    # _f의 역함수: CIELAB -> XYZ로 되돌릴 때 사용
    return np.where(t > _DELTA, t ** 3, 3 * _DELTA ** 2 * (t - 4 / 29))


def linear_to_cielab(lin: np.ndarray) -> np.ndarray:
    # 선형 RGB -> CIELAB (L*=밝기, a*=초록↔빨강, b*=파랑↔노랑 축)
    xyz = lin @ _XYZ_M.T / _WHITE_D65      # 먼저 XYZ로 변환하고 기준 흰색으로 정규화
    fx, fy, fz = _f(xyz[..., 0]), _f(xyz[..., 1]), _f(xyz[..., 2])
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], axis=-1)


def cielab_to_linear(lab: np.ndarray) -> np.ndarray:
    # CIELAB -> 선형 RGB (역변환). 추천 색상을 만들 때 L*만 조절하고 되돌리는 데 사용
    lab = np.asarray(lab, dtype=float)
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    xyz = np.stack([_f_inv(fx), _f_inv(fy), _f_inv(fz)], axis=-1) * _WHITE_D65
    return xyz @ _XYZ_M_INV.T


def hex_to_cielab(hex_str: str) -> np.ndarray:
    # HEX -> CIELAB 한 번에 변환 (delta_e 계산의 기본 빌딩 블록)
    rgb = np.array(hex_to_rgb(hex_str), dtype=float) / 255.0
    return linear_to_cielab(srgb_to_linear(rgb))


def cielab_to_hex(lab: np.ndarray) -> str:
    # CIELAB -> HEX 한 번에 변환 (추천 색상을 HEX로 내보낼 때 사용)
    srgb = linear_to_srgb(cielab_to_linear(lab))
    return rgb_to_hex(srgb * 255.0)


def delta_e(hex_a: str, hex_b: str) -> float:
    """Delta E (CIE76): Euclidean distance in CIELAB (L*, a*, b*).

    (한국어) 두 색의 지각적 거리. CIELAB 공간에서의 직선 거리(유클리드 거리)를 계산.
    값이 작을수록 두 색이 비슷해 보이고, 크면 명확히 다르게 보임.
    """
    return float(np.linalg.norm(hex_to_cielab(hex_a) - hex_to_cielab(hex_b)))
