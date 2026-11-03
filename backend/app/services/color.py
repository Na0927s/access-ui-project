"""Color conversions: HEX <-> sRGB <-> linear RGB <-> OKLab, and Delta E (OKLab).

(한국어 요약) 색상 표기법 변환과 색상 거리 계산을 담당하는 모듈.
- 웹 색상 표기(HEX)를 과학적 색 공간(OKLab)으로 변환하는 변환기 모음
- delta_e(): 두 색이 사람 눈에 얼마나 다르게 보이는지 수치화 (0이면 동일, 클수록 명확히 구분)
- 나머지 모듈(wcag, palette, recommend, analyzer)이 모두 이 파일의 함수를 사용함

색 공간 선택 (규칙 5, 10):
  과거에는 CIE76(CIELAB 유클리드 거리)을 사용했다. CIELAB은 포화 색상·청색 영역에서
  지각 균일성이 떨어져, 색각이상 시뮬레이션 후 잔여 거리를 과대평가하는 문제가 있었다
  (이를 억제하려고 비율 기반 판정 같은 꼼수가 필요했다).
  OKLab(Björn Ottosson, 2020)은 단순 유클리드 거리만으로 CIEDE2000급의 지각 균일성을
  보이며, 청색 영역 보정과 중성색 보정이 내장돼 있어 절대 거리만으로 정확한 판정이 가능하다.
  공식이 단순해 팀원이 설명하기 쉽고(규칙 10), CSS Color 4 모듈에 정식 채택됐다.
  출처: https://bottosson.github.io/posts/oklab/
"""
import re

import numpy as np

# 유효한 HEX 색상 형식 검증용 정규식 (#은 생략 가능)
HEX_RE = re.compile(r"^#?[0-9a-fA-F]{6}$")

# OKLab 변환 행렬 (Ottosson 2020). 선형 sRGB(D65) 기준.
# M1: 선형 RGB -> LMS. M2: 세제곱근을 취한 LMS' -> OKLab(L, a, b).
# (한국어) OKLab 변환은 "선형 RGB -> LMS -> 세제곱근 -> OKLab" 두 단계 행렬 곱으로 이루어짐.
_M1 = np.array([
    [0.4122214708, 0.5363325363, 0.0514459929],
    [0.2119034982, 0.6806995451, 0.1073969566],
    [0.0883024619, 0.2817188376, 0.6299787005],
])
_M2 = np.array([
    [0.2104542553, 0.7936177850, -0.0040720468],
    [1.9779984951, -2.4285922050, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.8086757660],
])
# 역변환 행렬: OKLab -> LMS'(M2_INV), LMS -> 선형 RGB(M1_INV).
# (한국어) 추천 색상을 만들 때 L만 조절한 뒤 다시 HEX로 되돌리는 데 사용.
_M1_INV = np.array([
    [4.0767416621, -3.3077115913, 0.2309699292],
    [-1.2684380046, 2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, 1.7076147010],
])
_M2_INV = np.array([
    [1.0, 0.3963377774, 0.2158037573],
    [1.0, -0.1055613458, -0.0638541728],
    [1.0, -0.0894841775, -1.2914855480],
])


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


def linear_to_oklab(lin: np.ndarray) -> np.ndarray:
    """Linear sRGB -> OKLab (L=밝기, a=초록↔빨강, b=파랑↔노랑 축).

    (한국어) 선형 RGB -> LMS -> (세제곱근) -> OKLab 순서로 변환.
    np.cbrt는 음수도 부호를 유지해 올바르게 처리함(범위 밖 값 대비).
    """
    lms = lin @ _M1.T
    lms_ = np.cbrt(lms)
    return lms_ @ _M2.T


def oklab_to_linear(lab: np.ndarray) -> np.ndarray:
    """OKLab -> linear sRGB (역변환). 추천 색상을 만들 때 L만 조절하고 되돌리는 데 사용.

    (한국어) OKLab -> LMS' -> (세제곱) -> 선형 RGB. 세제곱은 음수도 부호를 유지함.
    """
    lab = np.asarray(lab, dtype=float)
    lms_ = lab @ _M2_INV.T
    lms = lms_ ** 3
    return lms @ _M1_INV.T


def hex_to_oklab(hex_str: str) -> np.ndarray:
    # HEX -> OKLab 한 번에 변환 (delta_e 계산의 기본 빌딩 블록)
    rgb = np.array(hex_to_rgb(hex_str), dtype=float) / 255.0
    return linear_to_oklab(srgb_to_linear(rgb))


def oklab_to_hex(lab: np.ndarray) -> str:
    # OKLab -> HEX 한 번에 변환 (추천 색상을 HEX로 내보낼 때 사용)
    srgb = linear_to_srgb(oklab_to_linear(lab))
    return rgb_to_hex(srgb * 255.0)


def delta_e(hex_a: str, hex_b: str) -> float:
    """Delta E (OKLab): Euclidean distance in OKLab (L, a, b).

    (한국어) 두 색의 지각적 거리. OKLab 공간에서의 직선 거리(유클리드 거리)를 계산.
    값이 작을수록 두 색이 비슷해 보이고, 크면 명확히 다르게 보임.
    OKLab은 지각 균일성이 좋아 약 1.0 = JND(겨우 구분되는 차이) 기준으로 쓸 수 있다.
    """
    return float(np.linalg.norm(hex_to_oklab(hex_a) - hex_to_oklab(hex_b)))
