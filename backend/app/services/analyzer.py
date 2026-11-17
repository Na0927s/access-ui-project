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

import numpy as np
from PIL import Image

from .. import config
from .color import delta_e, hex_to_oklab, hex_to_rgb, linear_to_oklab, srgb_to_linear
from .cvd import simulate_hex, simulate_image
from .palette import extract_palette, flatten_on_white, resize_max_side
from .recommend import localize_recommendation, recommend
from .scoring import calculate_score, score_to_verdict
from . import texts
from .wcag import contrast_ratio, is_large_text, judge

# Configure Pillow's decompression-bomb guard once at module load (not per call).
# Setting it inside load_image() mutated global state on every request.
# (한국어) 압축폭탄 방지 상한을 모듈 로드 시 한 번만 설정 — load_image에서 매 호출마다
# 전역을 덮어쓰던 부작용을 제거하기 위해 이곳으로 옮김.
Image.MAX_IMAGE_PIXELS = config.MAX_IMAGE_PIXELS // 2


def confusion_verdict(d_orig: float, d_sim: float) -> str | None:
    """(한국어) 색상 혼동 판정. OKLab ΔE(지각 균일) 기준 절대 거리만으로 판정.
    - 원본에서 이미 비슷한 색이면 None (색약 때문이 아니라 원래 설계 문제 → 제외)
    - 시뮬레이션 후 잔여 ΔE가 작으면 FAIL/WARNING
    OKLab이 지각 균일해 색조 붕괴 후 잔여 거리를 정확히 반영하므로, 과거 CIE76처럼
    비율 기반 보조 판정이 필요 없다.
    """
    if d_orig < config.DISTINCT_MIN:
        return None  # already similar in the original; not a CVD-specific issue
    # 시뮬레이션 후 잔여 거리가 작으면 혼동
    if d_sim < config.CONFUSION_FAIL:
        return "FAIL"
    if d_sim < config.CONFUSION_WARN:
        return "WARNING"
    return "PASS"


# Overall verdict messages live in texts.RESULT_MESSAGES (ko/en, design doc section 6/7).


def _image_to_data_url(img: Image.Image) -> str:
    # Pillow 이미지를 PNG로 인코딩해 "data:image/png;base64,..." 문자열로 변환
    # (파일로 저장하지 않고 JSON 응답에 바로 담기 위함 — 이미지 비저장 규칙)
    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _apply_replacements(img: Image.Image, replacements: dict[str, str]) -> Image.Image:
    """Apply recommended color replacements to image pixels (in-memory, no disk write).

    (한국어) 추천 색상 매핑을 이미지 픽셀에 적용해 "대응 적용 이미지"를 생성.
    - replacements: {원본 HEX: 추천 HEX} — 문제가 발견된 색상만 포함.
    - 각 픽셀이 매핑의 원본 색과 OKLab ΔE < APPLY_REPLACE_DISTANCE 이내면 추천 색으로 교체.
      그 외 픽셀(안티앨리어싱·그라데이션·문제 없는 색)은 원본 유지 → 부작용 최소화.
    """
    if not replacements:
        return img
    # (한국어) 원본 색들을 한 번에 OKLab 배열로 변환해 벡터화된 거리 계산에 사용
    src_hexes = list(replacements.keys())
    src_oklab = np.array([hex_to_oklab(h) for h in src_hexes])        # (N, 3)
    dst_rgb = {h: hex_to_rgb(replacements[h]) for h in src_hexes}     # 원본 → 추천 RGB
    arr = np.asarray(img.convert("RGB"), dtype=np.float64) / 255.0    # (H, W, 3) sRGB 0~1
    pix_oklab = linear_to_oklab(srgb_to_linear(arr))                  # (H, W, 3) OKLab
    # 각 픽셀과 모든 원본 색의 거리 → 최소 거리가 임계값 이내인 픽셀만 교체
    # (H, W, N) 거리 배열: 픽셀별로 각 원본 색까지의 OKLab ΔE
    dists = np.linalg.norm(pix_oklab[..., None, :] - src_oklab, axis=-1)
    nearest_idx = np.argmin(dists, axis=-1)          # (H, W) 가장 가까운 원본 색 인덱스
    nearest_dist = np.min(dists, axis=-1)            # (H, W) 그때의 거리
    out = arr.copy()
    # 임계값 이내 픽셀의 위치만 추출
    mask = nearest_dist < config.APPLY_REPLACE_DISTANCE
    if not mask.any():
        return img
    # 교체할 픽셀에 대해, 가장 가까운 원본 색의 추천 RGB를 적용
    rows, cols = np.where(mask)
    for r, c in zip(rows, cols):
        src_h = src_hexes[nearest_idx[r, c]]
        out[r, c] = np.array(dst_rgb[src_h], dtype=np.float64) / 255.0
    return Image.fromarray(np.round(out * 255.0).astype(np.uint8), "RGB")


def _analyze_image_core(img: Image.Image, cvd_type: str, mode: str = "user") -> dict:
    """(한국어) 이미지 분석의 lang 무관 코어. 시뮬레이션·수치·판정·추천 후보(코어)까지만 계산.

    언어 의존 문구(issues 메시지, result_message, 추천 reason, non_color_tips)는
    _localize_image_result에서 덧붙인다. 코어는 lang과 무관해 캐시 키에서 lang을 빼고,
    언어 전환 시 코어 재사용 + 문구만 재적용해 2배 지연을 회피한다 (방안 A').
    """
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

    # 문제가 있는 항목만 이슈로 만들고, 개발자 모드라면 추천 색상도 함께 생성.
    # 이슈 메시지(message)는 lang 의존이므로 코어에는 넣지 않고 문구 적용에 필요한
    # 참조 데이터(fg/bg/ratio, a/b, type, mode)만 남긴다 → _localize_image_result가 채움.
    issues, recommendations, next_id = [], [], 1
    for p in contrast_pairs:
        if p["verdict"] == "PASS":
            continue
        # 대비율 미달 이슈 (FAIL이면 심각도 HIGH, WARNING이면 MEDIUM)
        issues.append({
            "id": next_id, "type": "LOW_CONTRAST",
            "severity": "HIGH" if p["verdict"] == "FAIL" else "MEDIUM",
            "colors": [p["fg"], p["bg"]],
            # 문구 적용용 참조 데이터 (lang 무관)
            "fg": p["fg"], "bg": p["bg"], "ratio": p["ratio"],
        })
        next_id += 1
        if mode == "developer":   # 추천 색상은 개발자 모드에서만 제공 (코어: reason 없음)
            recommendations.append(recommend(p["fg"], p["bg"], cvd_type))
    for p in confusable_pairs:
        if p["verdict"] == "PASS":
            continue
        # 색상 혼동 이슈 (시뮬레이션 후 구분 어려움).
        issues.append({
            "id": next_id, "type": "COLOR_CONFUSION",
            "severity": "HIGH" if p["verdict"] == "FAIL" else "MEDIUM",
            "colors": [p["a"], p["b"]],
            # 문구 적용용 참조 데이터 (label은 localizer가 CVD_LABELS[lang]으로 채움)
            "a": p["a"], "b": p["b"],
        })
        next_id += 1
        if mode == "developer":
            recommendations.append(recommend(p["a"], p["b"], cvd_type))

    # 접근성 점수는 내부 판정 산출용으로만 사용하고 응답에는 노출하지 않는다.
    # (한국어) 점수는 전체 판정(verdict)을 구하기 위해서만 계산 — 사용자에게는 판정만 전달.
    score = calculate_score(
        [p["verdict"] for p in contrast_pairs],
        [p["verdict"] for p in confusable_pairs],
    )
    # 전체 판정은 점수 구간 기반 (90↑ PASS, 70~89 WARNING, <70 FAIL).
    verdict = score_to_verdict(score)
    core: dict = {
        "cvd_type": cvd_type,
        "width": width, "height": height,
        "simulated_image": _image_to_data_url(sim),   # 시뮬레이션 결과 (base64 data URL)
        "palette": palette,                           # 주요 색상 목록
        "contrast_pairs": contrast_pairs,             # 대비 검사 결과
        "confusable_pairs": confusable_pairs,         # 색상 혼동 검사 결과
        "issues": issues,                             # 발견된 문제 (message는 localizer가 채움)
        "verdict": verdict,
    }
    if mode == "developer":
        core["recommendations"] = recommendations     # 코어 (reason 없음)
        # 대응 적용 이미지 비교용: 추천 색상을 이미지에 적용한 결과와 그 시뮬레이션 생성.
        # recommendations의 순서는 issues와 동일(각 이슈의 첫 후보를 적용 색으로 사용).
        # 같은 색이 여러 이슈에 걸쳐 다른 추천으로 나올 수 있음 — 첫 번째(더 심각한 이슈)를 유지.
        replacements: dict[str, str] = {}
        for rec in recommendations:
            # CONDITIONAL이 아닌 첫 후보 우선, 없으면 첫 후보. 후보가 없으면 건너뜀.
            cands = rec.get("candidates") or []
            if not cands:
                continue
            fix = next((c for c in cands if c["grade"] != "CONDITIONAL"), cands[0])
            # setdefault: 같은 current 색이 이미 있으면 덮어쓰지 않음 (첫 이슈 우선)
            replacements.setdefault(rec["current"], fix["hex"])
        if replacements:
            base = resize_max_side(img, config.SIMULATION_MAX_SIDE)
            improved = _apply_replacements(base, replacements)
            improved_sim = simulate_image(improved, cvd_type)
            core["improved_image"] = _image_to_data_url(improved)
            core["improved_simulated_image"] = _image_to_data_url(improved_sim)
    return core


def _localize_image_result(core: dict, cvd_type: str, mode: str, lang: str = "ko") -> dict:
    """(한국어) lang 무관 코어에 lang 의존 문구를 덧붙여 응답을 완성.

    - issues[].message: LOW_CONTRAST / COLOR_CONFUSION, 모드별·언어별 템플릿으로 조립.
    - result_message: RESULT_MESSAGES[verdict][lang].
    - recommendations: 각 후보에 reason, rec에 non_color_tips 추가 (localize_recommendation).
    코어는 그대로 두고 복사본에 문구를 얹어 반환한다 (코어 재사용 보존).
    """
    label = texts.CVD_LABELS[cvd_type][lang]  # 응답 메시지에 쓸 색약 유형 이름
    response = dict(core)
    localized_issues = []
    for issue in core.get("issues", []):
        item = {k: v for k, v in issue.items() if k not in ("fg", "bg", "ratio", "a", "b")}
        if issue["type"] == "LOW_CONTRAST":
            if mode == "user":
                msg = texts.LOW_CONTRAST_ISSUE["user"][lang]
            else:
                msg = texts.LOW_CONTRAST_ISSUE["developer"][lang].format(
                    fg=issue["fg"], bg=issue["bg"], ratio=f"{issue['ratio']:.2f}")
        else:  # COLOR_CONFUSION
            if mode == "user":
                msg = texts.COLOR_CONFUSION_ISSUE["user"][lang].format(label=label)
            else:
                msg = texts.COLOR_CONFUSION_ISSUE["developer"][lang].format(
                    label=label, a=issue["a"], b=issue["b"])
        item["message"] = msg
        localized_issues.append(item)
    response["issues"] = localized_issues
    response["result_message"] = texts.RESULT_MESSAGES[core["verdict"]][lang]
    if mode == "developer" and "recommendations" in core:
        response["recommendations"] = [
            localize_recommendation(rec, lang) for rec in core["recommendations"]
        ]
    return response


def analyze_image(img: Image.Image, cvd_type: str, mode: str = "user", lang: str = "ko") -> dict:
    """(한국어) 이미지 분석 전체 파이프라인. 사용자 모드와 개발자 모드가 같은 로직을 공유하되,
    추천 색상(recommendations)은 개발자 모드에서만 결과에 포함한다.

    코어(_analyze_image_core, lang 무관) 계산 후 문구(_localize_image_result)를 적용해 반환.
    라우터는 코어만 캐싱하고 언어별로 문구를 재적용한다 (방안 A')."""
    core = _analyze_image_core(img, cvd_type, mode)
    return _localize_image_result(core, cvd_type, mode, lang)


def _analyze_elements_core(elements: list[dict], cvd_type: str) -> dict:
    """(한국어) 코드 분석의 lang 무관 코어. 요소별 대비 검사 + 해결 카드(css_fix까지)까지만 계산.

    problem/non_color_fix/result_message는 lang 의존이라 _localize_elements_result가 채운다.
    """
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
                rec = recommend(cur, other, cvd_type)   # 코어 (reason 없음)
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
            # problem/non_color_fix는 lang 의존 → 코어에는 넣지 않음. localizer가 채운다.
            boxes.append({
                "selector": el["selector"],
                "check_type": "CONTRAST",
                "css_fix": css_fix,                       # 바로 복사해 쓸 수 있는 CSS 한 줄
            })
        # 명암 대비(LIGHTNESS) 보조 검사는 제거되었다 — 색상 대비(CONTRAST)와 색 추천만 제공.

    # 전체 판정: 점수 구간 기반 (90↑ PASS, 70~89 WARNING, <70 FAIL).
    # 미달 요소 수(failed)는 메시지 표시용으로 별도 집계. 점수 자체는 응답에 노출하지 않는다.
    verdicts = [r["verdict"] for r in results]
    failed = verdicts.count("FAIL") + verdicts.count("WARNING")
    score = calculate_score(verdicts, [])
    verdict = score_to_verdict(score)
    return {
        "results": results,                  # 요소별 상세 결과 (테이블에 표시됨)
        "solution_boxes": boxes,             # 문제 해결 카드 (problem/non_color_fix는 localizer가 채움)
        "verdict": verdict,
        "failed": failed,                    # result_message 조립용 (lang 의존 문구에만 사용)
        "summary": {                         # 통계 요약 (전체/PASS/WARNING/FAIL 개수)
            "total": len(results), "pass": verdicts.count("PASS"),
            "warning": verdicts.count("WARNING"), "fail": verdicts.count("FAIL"),
        },
    }


def _localize_elements_result(core: dict, lang: str = "ko") -> dict:
    """(한국어) 코드 분석 코어에 lang 의존 문구(problem, non_color_fix, result_message)를 덧붙여 완성."""
    response = dict(core)
    response["solution_boxes"] = [
        {
            **box,
            "problem": texts.DEV_CONTRAST_PROBLEM[lang],
            "non_color_fix": texts.DEV_CONTRAST_TIP[lang],  # 색 외 개선 팁
        }
        for box in core.get("solution_boxes", [])
    ]
    verdict = core["verdict"]
    failed = core.get("failed", 0)
    response["result_message"] = (
        texts.DEV_RESULT[verdict][lang]
        if verdict == "PASS"
        else texts.DEV_RESULT[verdict][lang].format(failed=failed)
    )
    # failed는 메시지 조립용 내부값 → 응답에서는 노출하지 않음 (summary에 이미 개수 있음)
    response.pop("failed", None)
    return response


def analyze_elements(elements: list[dict], cvd_type: str, lang: str = "ko") -> dict:
    """(한국어) 개발자 모드 코드 분석: 요소별 대비 검사 + 문제 해결 방법 카드 생성.

    코어(_analyze_elements_core, lang 무관) 계산 후 문구(_localize_elements_result)를 적용해 반환."""
    core = _analyze_elements_core(elements, cvd_type)
    return _localize_elements_result(core, lang)


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


__all__ = [
    "analyze_image", "analyze_elements", "load_image", "flatten_on_white",
    "_analyze_image_core", "_localize_image_result",
    "_analyze_elements_core", "_localize_elements_result",
]
