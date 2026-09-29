"""Analysis pipelines for image mode and developer (HTML/CSS) mode."""
import base64
from io import BytesIO
from itertools import combinations

from PIL import Image

from .. import config
from .color import delta_e
from .cvd import simulate_hex, simulate_image
from .palette import extract_palette, flatten_on_white, resize_max_side
from .recommend import recommend
from .scoring import calculate_score
from . import texts
from .wcag import contrast_ratio, is_large_text, judge


def confusion_verdict(d_orig: float, d_sim: float) -> str | None:
    if d_orig < config.DISTINCT_MIN:
        return None  # already similar in the original; not a CVD-specific issue
    if d_sim < config.CONFUSION_FAIL:
        return "FAIL"
    if d_sim < config.CONFUSION_WARN:
        return "WARNING"
    return "PASS"


# Overall verdict messages live in texts.RESULT_MESSAGES (ko/en, design doc section 6/7).


def _image_to_data_url(img: Image.Image) -> str:
    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def analyze_image(img: Image.Image, cvd_type: str, mode: str = "user", lang: str = "ko") -> dict:
    label = texts.CVD_LABELS[cvd_type][lang]
    width, height = img.size

    sim = simulate_image(resize_max_side(img, config.SIMULATION_MAX_SIDE), cvd_type)
    palette = extract_palette(img)

    # Contrast: treat the most common color as the background candidate (heuristic).
    contrast_pairs = []
    if palette:
        bg = palette[0]["hex"]
        for c in palette[1:]:
            if c["ratio"] < config.CONTRAST_PAIR_MIN_RATIO:
                continue
            ratio = contrast_ratio(c["hex"], bg)
            contrast_pairs.append({"fg": c["hex"], "bg": bg, "ratio": round(ratio, 2), **judge(ratio)})

    # Distinguishability between every pair of dominant colors.
    confusable_pairs = []
    for a, b in combinations([c["hex"] for c in palette], 2):
        d_orig = delta_e(a, b)
        d_sim = delta_e(simulate_hex(a, cvd_type), simulate_hex(b, cvd_type))
        verdict = confusion_verdict(d_orig, d_sim)
        if verdict is None:
            continue
        confusable_pairs.append({
            "a": a, "b": b,
            "distance_original": round(d_orig, 3),
            "distance_simulated": round(d_sim, 3),
            "verdict": verdict,
        })

    issues, recommendations, next_id = [], [], 1
    for p in contrast_pairs:
        if p["verdict"] == "PASS":
            continue
        issues.append({
            "id": next_id, "type": "LOW_CONTRAST",
            "severity": "HIGH" if p["verdict"] == "FAIL" else "MEDIUM",
            "colors": [p["fg"], p["bg"]],
            "message": texts.LOW_CONTRAST_ISSUE[lang].format(fg=p["fg"], bg=p["bg"], ratio=f"{p['ratio']:.2f}"),
        })
        next_id += 1
        if mode == "developer":
            recommendations.append(recommend(p["fg"], p["bg"], cvd_type, lang))
    for p in confusable_pairs:
        if p["verdict"] == "PASS":
            continue
        issues.append({
            "id": next_id, "type": "COLOR_CONFUSION",
            "severity": "HIGH" if p["verdict"] == "FAIL" else "MEDIUM",
            "colors": [p["a"], p["b"]],
            "message": texts.COLOR_CONFUSION_ISSUE[lang].format(label=label, a=p["a"], b=p["b"]),
        })
        next_id += 1
        if mode == "developer":
            recommendations.append(recommend(p["a"], p["b"], cvd_type, lang))

    score = calculate_score(
        [p["verdict"] for p in contrast_pairs],
        [p["verdict"] for p in confusable_pairs],
    )
    verdict = "FAIL" if issues else "PASS"
    response = {
        "cvd_type": cvd_type,
        "width": width, "height": height,
        "simulated_image": _image_to_data_url(sim),
        "palette": palette,
        "contrast_pairs": contrast_pairs,
        "confusable_pairs": confusable_pairs,
        "issues": issues,
        "verdict": verdict,
        "result_message": texts.RESULT_MESSAGES[verdict][lang],
        "score": score,
        "score_notice": texts.SCORE_NOTICE[lang],
    }
    if mode == "developer":
        response["recommendations"] = recommendations
    return response


def analyze_elements(elements: list[dict], cvd_type: str, lang: str = "ko") -> dict:
    results, boxes = [], []
    for el in elements:
        ratio = contrast_ratio(el["color"], el["background"])
        large = is_large_text(el.get("font_size_px"), el.get("font_weight"))
        j = judge(ratio)
        # Font size is known in developer mode, so judge against the exact criterion.
        verdict = j["large_text"] if large else j["normal_text"]
        d_sim = delta_e(simulate_hex(el["color"], cvd_type), simulate_hex(el["background"], cvd_type))
        results.append({
            "selector": el["selector"], "color": el["color"].upper(), "background": el["background"].upper(),
            "ratio": round(ratio, 2), "is_large_text": large, **j, "verdict": verdict,
            "distance_simulated": round(d_sim, 3),
        })
        if verdict != "PASS":
            # Try changing either the text color or the background; keep the smaller change.
            # Normal text needs AA (4.5:1); large text may use CONDITIONAL (3:1) colors.
            allowed = {"STRONG", "RECOMMENDED", "CONDITIONAL"} if large else {"STRONG", "RECOMMENDED"}
            options = []
            for prop, cur, other in (("color", el["color"], el["background"]),
                                     ("background-color", el["background"], el["color"])):
                rec = recommend(cur, other, cvd_type, lang)
                ok = [c for c in rec["candidates"] if c["grade"] in allowed]
                if ok:
                    best = min(ok, key=lambda c: c["distance_from_current"])
                    options.append((best["distance_from_current"], prop, best["hex"]))
            css_fix = None
            if options:
                _, prop, fix = min(options)
                css_fix = f"{el['selector']} {{ {prop}: {fix}; }}"
            need = texts.NEED_LARGE[lang] if large else "4.5:1"
            boxes.append({
                "selector": el["selector"],
                "check_type": "CONTRAST",
                "problem": texts.DEV_CONTRAST_PROBLEM[lang].format(ratio=f"{ratio:.2f}", need=need),
                "css_fix": css_fix,
                "non_color_fix": texts.DEV_CONTRAST_TIP[lang],
            })
        elif d_sim < config.CONFUSION_WARN:
            boxes.append({
                "selector": el["selector"],
                "check_type": "LIGHTNESS",
                "problem": texts.DEV_LIGHTNESS_PROBLEM[lang].format(label=texts.CVD_LABELS[cvd_type][lang]),
                "css_fix": None,
                "non_color_fix": texts.DEV_LIGHTNESS_TIP[lang],
            })

    verdicts = [r["verdict"] for r in results]
    failed = verdicts.count("FAIL") + verdicts.count("WARNING")
    verdict = "FAIL" if failed else "PASS"
    result_message = (
        texts.DEV_RESULT[verdict][lang]
        if verdict == "PASS"
        else texts.DEV_RESULT[verdict][lang].format(failed=failed)
    )
    score = calculate_score(verdicts, [])
    return {
        "results": results,
        "solution_boxes": boxes,
        "verdict": verdict,
        "result_message": result_message,
        "summary": {
            "total": len(results), "pass": verdicts.count("PASS"),
            "warning": verdicts.count("WARNING"), "fail": verdicts.count("FAIL"), "score": score,
        },
        "score_notice": texts.SCORE_NOTICE[lang],
    }


def load_image(data: bytes) -> Image.Image:
    """Open and verify an uploaded image fully in memory (never written to disk)."""
    # Pillow raises DecompressionBombError above 2x this value.
    Image.MAX_IMAGE_PIXELS = config.MAX_IMAGE_PIXELS // 2
    probe = Image.open(BytesIO(data))
    fmt = probe.format
    probe.verify()
    if fmt not in config.ALLOWED_FORMATS:
        raise ValueError("UNSUPPORTED_FORMAT")
    img = Image.open(BytesIO(data))
    img.load()
    return img


__all__ = ["analyze_image", "analyze_elements", "load_image", "flatten_on_white"]
