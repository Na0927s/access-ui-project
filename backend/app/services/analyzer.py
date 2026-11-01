"""Analysis pipelines for image mode and developer (HTML/CSS) mode.

(한국어 요약) 분석 파이프라인의 총괄 모듈 (서비스의 두뇌 역할).
- analyze_image(): 사용자/개발자 모드의 "이미지 분석" 전체 흐름
  (시뮬레이션 → 팔레트 추출 → 대비 검사 → 색상 혼동 검사 → 이슈·점수·추천 생성)
- analyze_elements(): 개발자 모드의 "HTML/CSS 코드 분석" 흐름 (요소별 판정 + 해결 카드)
- load_image(): 업로드된 이미지를 메모리에서만 여는 로더 (디스크 저장 금지 규칙)
"""
import base64
from io import BytesIO
from itertools import combinations

from PIL import Image

from .. import config
from .color import delta_e
from .cvd import simulate_hex, simulate_image
from .palette import extract_palette, flatten_on_white, resize_max_side
from .recommend import recommend
from .scoring import calculate_score, score_to_verdict
from . import texts
from .wcag import contrast_ratio, is_large_text, judge

# Configure Pillow's decompression-bomb guard once at module load (not per call).
# Setting it inside load_image() mutated global state on every request.
# (한국어) 압축폭탄 방지 상한을 모듈 로드 시 한 번만 설정 — load_image에서 매 호출마다
# 전역을 덮어쓰던 부작용을 제거하기 위해 이곳으로 옮김.
Image.MAX_IMAGE_PIXELS = config.MAX_IMAGE_PIXELS // 2


def confusion_verdict(d_orig: float, d_sim: float) -> str | None:
    """(한국어) 색상 혼동 판정.
    - 원본에서 이미 비슷한 색이면 None (색약 때문이 아니라 원래 설계 문제 → 제외)
    - 1차: 시뮬레이션 후 ΔE 절대값이 작으면 FAIL/WARNING (기존 임계값)
    - 2차: 시뮬레이션이 원본 거리의 대부분을 붕괴시켰고 잔여도 작으면 FAIL/WARNING (비율 기반)
      — CIE76이 색조 붕괴 후 잔여 거리를 과대평가하는 문제를 보완
    """
    if d_orig < config.DISTINCT_MIN:
        return None  # already similar in the original; not a CVD-specific issue
    # 1차: 절대 잔여 거리가 작으면 명확히 혼동
    if d_sim < config.CONFUSION_FAIL:
        return "FAIL"
    if d_sim < config.CONFUSION_WARN:
        return "WARNING"
    # 2차: 거리 붕괴 비율로 판정. d_orig > 0 은 DISTINCT_MIN(>0) 필터로 보장.
    # 빨강/녹색 쌍은 색조가 붕괴해 d_sim/d_orig 가 작아지지만, 절대 d_sim 은 크게 남아
    # 절대 임계값만으로는 PASS로 빠지는 것을 잡아낸다.
    ratio = d_sim / d_orig
    if ratio < config.CONFUSION_FAIL_RATIO and d_sim < config.CONFUSION_FAIL_ABS_MAX:
        return "FAIL"
    if ratio < config.CONFUSION_WARN_RATIO and d_sim < config.CONFUSION_WARN_ABS_MAX:
        return "WARNING"
    return "PASS"


# Overall verdict messages live in texts.RESULT_MESSAGES (ko/en, design doc section 6/7).


def _image_to_data_url(img: Image.Image) -> str:
    # Pillow 이미지를 PNG로 인코딩해 "data:image/png;base64,..." 문자열로 변환
    # (파일로 저장하지 않고 JSON 응답에 바로 담기 위함 — 이미지 비저장 규칙)
    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def analyze_image(img: Image.Image, cvd_type: str, mode: str = "user", lang: str = "ko") -> dict:
    """(한국어) 이미지 분석 전체 파이프라인. 사용자 모드와 개발자 모드가 같은 로직을 공유하되,
    추천 색상(recommendations)은 개발자 모드에서만 결과에 포함한다."""
    label = texts.CVD_LABELS[cvd_type][lang]  # 응답 메시지에 쓸 색약 유형 이름
    width, height = img.size

    sim = simulate_image(resize_max_side(img, config.SIMULATION_MAX_SIDE), cvd_type)  # 색약 시뮬레이션 이미지
    palette = extract_palette(img)                                                   # 주요 색상 추출

    # Contrast: treat the most common color as the background candidate (heuristic).
    # (한국어) 대비 검사 휴리스틱: 가장 많이 등장한 색을 배경으로 간주하고,
    # 나머지 주요 색들을 전경(글자 등)으로 보고 배경과의 대비율을 검사.
    contrast_pairs = []
    if palette:
        bg = palette[0]["hex"]            # 비율이 가장 큰 색 = 배경 후보
        for c in palette[1:]:            # 나머지 색은 전경 후보
            if c["ratio"] < config.CONTRAST_PAIR_MIN_RATIO:
                continue                 # 1% 미만 색상은 검사에서 제외
            ratio = contrast_ratio(c["hex"], bg)
            contrast_pairs.append({"fg": c["hex"], "bg": bg, "ratio": round(ratio, 2), **judge(ratio)})

    # Distinguishability between every pair of dominant colors.
    # (한국어) 색상 혼동 검사: 추출된 주요 색들의 "모든 쌍"에 대해
    # 원본 거리(ΔE)와 시뮬레이션 후 거리(ΔE)를 비교해 색약 환경에서 구분이 어려워지는 쌍을 찾음.
    confusable_pairs = []
    for a, b in combinations([c["hex"] for c in palette], 2):
        d_orig = delta_e(a, b)                                             # 원본에서 두 색의 거리
        d_sim = delta_e(simulate_hex(a, cvd_type), simulate_hex(b, cvd_type))  # 시뮬레이션 후 거리
        verdict = confusion_verdict(d_orig, d_sim)
        if verdict is None:
            continue
        confusable_pairs.append({
            "a": a, "b": b,
            "distance_original": round(d_orig, 3),
            "distance_simulated": round(d_sim, 3),
            "verdict": verdict,
        })

    # 문제가 있는 항목만 이슈로 만들고, 개발자 모드라면 추천 색상도 함께 생성
    issues, recommendations, next_id = [], [], 1
    for p in contrast_pairs:
        if p["verdict"] == "PASS":
            continue
        # 대비율 미달 이슈 (FAIL이면 심각도 HIGH, WARNING이면 MEDIUM)
        issues.append({
            "id": next_id, "type": "LOW_CONTRAST",
            "severity": "HIGH" if p["verdict"] == "FAIL" else "MEDIUM",
            "colors": [p["fg"], p["bg"]],
            "message": texts.LOW_CONTRAST_ISSUE[lang].format(fg=p["fg"], bg=p["bg"], ratio=f"{p['ratio']:.2f}"),
        })
        next_id += 1
        if mode == "developer":   # 추천 색상은 개발자 모드에서만 제공
            recommendations.append(recommend(p["fg"], p["bg"], cvd_type, lang))
    for p in confusable_pairs:
        if p["verdict"] == "PASS":
            continue
        # 색상 혼동 이슈 (시뮬레이션 후 구분 어려움)
        issues.append({
            "id": next_id, "type": "COLOR_CONFUSION",
            "severity": "HIGH" if p["verdict"] == "FAIL" else "MEDIUM",
            "colors": [p["a"], p["b"]],
            "message": texts.COLOR_CONFUSION_ISSUE[lang].format(label=label, a=p["a"], b=p["b"]),
        })
        next_id += 1
        if mode == "developer":
            recommendations.append(recommend(p["a"], p["b"], cvd_type, lang))

    # 모든 판정을 점수 공식에 넣어 자체 접근성 점수 산출
    score = calculate_score(
        [p["verdict"] for p in contrast_pairs],
        [p["verdict"] for p in confusable_pairs],
    )
    # 전체 판정은 점수 구간 기반 (80↑ PASS, 60~79 WARNING, <60 FAIL).
    # 이전엔 "이슈 1개라도 있으면 FAIL" 이분법이라 점수 95점인데 FAIL이 되는 모순이 있었음.
    verdict = score_to_verdict(score)
    response = {
        "cvd_type": cvd_type,
        "width": width, "height": height,
        "simulated_image": _image_to_data_url(sim),   # 시뮬레이션 결과 (base64 data URL)
        "palette": palette,                           # 주요 색상 목록
        "contrast_pairs": contrast_pairs,             # 대비 검사 결과
        "confusable_pairs": confusable_pairs,         # 색상 혼동 검사 결과
        "issues": issues,                             # 발견된 문제 목록
        "verdict": verdict,
        "result_message": texts.RESULT_MESSAGES[verdict][lang],
        "score": score,
        "score_notice": texts.SCORE_NOTICE[lang],     # "자체 지표" 고지 문구
    }
    if mode == "developer":
        response["recommendations"] = recommendations
    return response


def analyze_elements(elements: list[dict], cvd_type: str, lang: str = "ko") -> dict:
    """(한국어) 개발자 모드 코드 분석: 요소별 대비 검사 + 문제 해결 방법 카드 생성."""
    results, boxes = [], []
    for el in elements:
        # 요소의 글자색/배경색 대비율 계산 후 세 가지 기준으로 판정
        ratio = contrast_ratio(el["color"], el["background"])
        large = is_large_text(el.get("font_size_px"), el.get("font_weight"))
        j = judge(ratio)
        # Font size is known in developer mode, so judge against the exact criterion.
        # (한국어) 코드 모드는 폰트 크기를 알 수 있으므로, 일반/큰 텍스트 기준 중
        # 정확히 해당하는 기준 하나로만 최종 판정을 내림.
        verdict = j["large_text"] if large else j["normal_text"]
        # 시뮬레이션 후 글자·배경의 ΔE (명암이 얼마나 줄어드는지 확인용)
        d_sim = delta_e(simulate_hex(el["color"], cvd_type), simulate_hex(el["background"], cvd_type))
        results.append({
            "selector": el["selector"], "color": el["color"].upper(), "background": el["background"].upper(),
            "ratio": round(ratio, 2), "is_large_text": large, **j, "verdict": verdict,
            "distance_simulated": round(d_sim, 3),
        })
        if verdict != "PASS":
            # Try changing either the text color or the background; keep the smaller change.
            # Normal text needs AA (4.5:1); large text may use CONDITIONAL (3:1) colors.
            # (한국어) 글자색과 배경색 중 변경 폭이 더 작은 쪽을 고르기 위해
            # 양쪽 모두에 대해 추천을 받아본다. 큰 텍스트는 조건부(3:1) 색도 허용.
            allowed = {"STRONG", "RECOMMENDED", "CONDITIONAL"} if large else {"STRONG", "RECOMMENDED"}
            options = []
            for prop, cur, other in (("color", el["color"], el["background"]),
                                     ("background-color", el["background"], el["color"])):
                rec = recommend(cur, other, cvd_type, lang)
                ok = [c for c in rec["candidates"] if c["grade"] in allowed]
                if ok:
                    # 원래 색에서 가장 적게 변하는 후보를 선택
                    best = min(ok, key=lambda c: c["distance_from_current"])
                    options.append((best["distance_from_current"], prop, best["hex"]))
            css_fix = None
            if options:
                # 두 옵션(글자색 변경 vs 배경색 변경) 중 변경 폭이 작은 쪽으로 CSS 수정안 생성
                _, prop, fix = min(options)
                css_fix = f"{el['selector']} {{ {prop}: {fix}; }}"
            need = texts.NEED_LARGE[lang] if large else "4.5:1"   # 이 요소가 만족해야 하는 기준
            boxes.append({
                "selector": el["selector"],
                "check_type": "CONTRAST",
                "problem": texts.DEV_CONTRAST_PROBLEM[lang].format(ratio=f"{ratio:.2f}", need=need),
                "css_fix": css_fix,                       # 바로 복사해 쓸 수 있는 CSS 한 줄
                "non_color_fix": texts.DEV_CONTRAST_TIP[lang],  # 색 외 개선 팁
            })
        elif d_sim < config.CONFUSION_WARN:
            # 대비율은 통과했지만, 색약 시뮬레이션 시 명암 차가 크게 줄어드는 경우 → 별도 경고 카드
            boxes.append({
                "selector": el["selector"],
                "check_type": "LIGHTNESS",
                "problem": texts.DEV_LIGHTNESS_PROBLEM[lang].format(label=texts.CVD_LABELS[cvd_type][lang]),
                "css_fix": None,
                "non_color_fix": texts.DEV_LIGHTNESS_TIP[lang],
            })

    # 전체 판정: 점수 구간 기반 (80↑ PASS, 60~79 WARNING, <60 FAIL).
    # 미달 요소 수(failed)는 메시지 표시용으로 별도 집계.
    verdicts = [r["verdict"] for r in results]
    failed = verdicts.count("FAIL") + verdicts.count("WARNING")
    score = calculate_score(verdicts, [])
    verdict = score_to_verdict(score)
    result_message = (
        texts.DEV_RESULT[verdict][lang]
        if verdict == "PASS"
        else texts.DEV_RESULT[verdict][lang].format(failed=failed)
    )
    score = calculate_score(verdicts, [])
    return {
        "results": results,                  # 요소별 상세 결과 (테이블에 표시됨)
        "solution_boxes": boxes,             # 문제 해결 방법 카드 목록
        "verdict": verdict,
        "result_message": result_message,
        "summary": {                         # 통계 요약 (전체/PASS/WARNING/FAIL 개수 + 점수)
            "total": len(results), "pass": verdicts.count("PASS"),
            "warning": verdicts.count("WARNING"), "fail": verdicts.count("FAIL"), "score": score,
        },
        "score_notice": texts.SCORE_NOTICE[lang],
    }


def load_image(data: bytes) -> Image.Image:
    """Open and verify an uploaded image fully in memory (never written to disk).

    (한국어) 업로드된 이미지 로더 — 프로젝트 규칙 3번(이미지 비저장).
    BytesIO로만 다루고 디스크에 절대 쓰지 않으며, 형식 검증도 수행.
    """
    # Pillow's MAX_IMAGE_PIXELS guard is configured once at module load (see top of file).
    # (한국어) 압축폭탄 방지 상한은 모듈 로드 시 이미 설정됨 (파일 상단 참고)
    probe = Image.open(BytesIO(data))  # 바이트 데이터에서 이미지 열기 (파일 경로 불필요)
    fmt = probe.format
    probe.verify()                     # 이미지 구조 무결성 검사 (깨진 파일 감지)
    if fmt not in config.ALLOWED_FORMATS:
        raise ValueError("UNSUPPORTED_FORMAT")  # PNG/JPEG 외 형식은 거부
    img = Image.open(BytesIO(data))    # verify() 후에는 다시 열어야 실제 사용 가능
    img.load()
    return img


__all__ = ["analyze_image", "analyze_elements", "load_image", "flatten_on_white"]
