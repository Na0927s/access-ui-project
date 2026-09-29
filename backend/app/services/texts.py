"""Bilingual result message templates (design doc section 6/7 example sentences).

Korean is the default language; English is returned when the frontend requests
lang="en". This works without any AI API key — /api/ai/* remains an optional
polish layer on top.
"""

CVD_LABELS = {
    "protan": {"ko": "적색 계열", "en": "red-type"},
    "deutan": {"ko": "녹색 계열", "en": "green-type"},
    "tritan": {"ko": "청색 계열", "en": "blue-type"},
}

RESULT_MESSAGES = {
    "PASS": {
        "ko": "색상 구별에 큰 문제가 발견되지 않았습니다.",
        "en": "No major problems with color distinguishability were found.",
    },
    "FAIL": {
        "ko": "선택한 색각 이상 유형에서 일부 색상을 구별하기 어려울 수 있습니다.",
        "en": "Some colors may be hard to distinguish for the selected deficiency type.",
    },
}

LOW_CONTRAST_ISSUE = {
    "ko": "{fg}와 {bg}의 대비율이 {ratio}:1로 일반 텍스트 기준(4.5:1)에 미달할 가능성이 있습니다.",
    "en": "The contrast between {fg} and {bg} is {ratio}:1, which may fall below the normal-text criterion (4.5:1).",
}

COLOR_CONFUSION_ISSUE = {
    "ko": "{label} 색각이상 환경에서 {a}와 {b}의 구분이 어려울 가능성이 있습니다. "
          "색상만으로 정보를 전달한다면 아이콘이나 텍스트를 함께 사용하세요.",
    "en": "Under {label} color vision deficiency, {a} and {b} may be hard to tell apart. "
          "If color alone conveys the information, add icons or text as well.",
}

DEV_RESULT = {
    "PASS": {
        "ko": "모든 요소가 명암 대비 기준을 통과했습니다.",
        "en": "All elements passed the contrast criteria.",
    },
    "FAIL": {
        "ko": "{failed}개 요소가 기준에 미달했습니다. 아래 문제 해결 방법을 확인하세요.",
        "en": "{failed} elements fell below the criteria. See the fixes below.",
    },
}

DEV_CONTRAST_PROBLEM = {
    "ko": "텍스트 대비율 {ratio}:1로 기준({need})에 미달합니다.",
    "en": "The text contrast ratio {ratio}:1 falls below the criterion ({need}).",
}

NEED_LARGE = {"ko": "3:1(큰 텍스트)", "en": "3:1 large text"}

DEV_CONTRAST_TIP = {
    "ko": "색 변경만으로 어렵다면 배경색을 조정하거나 굵기·크기를 키우세요.",
    "en": "If a color change alone is not enough, adjust the background or increase the weight/size.",
}

DEV_LIGHTNESS_PROBLEM = {
    "ko": "{label} 색각이상 환경에서 글자와 배경의 명암 차이가 작아집니다.",
    "en": "Under {label} color vision deficiency, the lightness difference between text and background becomes smaller.",
}

DEV_LIGHTNESS_TIP = {
    "ko": "명도 차이를 더 크게 하거나 테두리·밑줄을 추가하세요.",
    "en": "Increase the lightness difference or add a border/underline.",
}

GRADE_REASON = {
    "STRONG": {
        "ko": "AAA 기준(7:1) 이상으로 일반 텍스트에 충분한 대비를 제공합니다.",
        "en": "Meets AAA (7:1) or better, providing ample contrast for normal text.",
    },
    "RECOMMENDED": {
        "ko": "AA 기준(4.5:1)을 만족해 일반 텍스트에 사용할 수 있습니다.",
        "en": "Meets AA (4.5:1), so it can be used for normal text.",
    },
    "CONDITIONAL": {
        "ko": "큰 텍스트나 UI 요소(3:1)에만 사용할 수 있습니다.",
        "en": "Usable only for large text or UI elements (3:1).",
    },
}

NON_COLOR_TIPS = [
    {
        "ko": "상태를 나타내는 아이콘(✓, !, ✕)을 함께 표시하세요.",
        "en": "Also show status icons (✓, !, ✕) alongside color.",
    },
    {
        "ko": "색 대신 또는 색과 함께 텍스트 라벨을 붙이세요.",
        "en": "Add text labels instead of, or along with, color.",
    },
    {
        "ko": "테두리·밑줄·패턴처럼 모양으로도 구분되게 하세요.",
        "en": "Make items distinguishable by shape too, e.g. borders, underlines or patterns.",
    },
]

SCORE_NOTICE = {
    "ko": "접근성 점수는 본 서비스의 분석 항목을 기반으로 산출한 자체 평가 지표이며 공식 WCAG 인증 점수가 아닙니다.",
    "en": "The accessibility score is an in-house metric based on this service's analysis items; "
          "it is not an official WCAG certification score.",
}

FALLBACK_EXPLAIN = {
    "issues": {
        "ko": "{count}개의 접근성 문제가 발견되었습니다. 아래 추천 색상과 비색상 개선 방법을 확인해보세요.",
        "en": "{count} accessibility issues were found. Check the suggested colors and non-color fixes below.",
    },
    "no_issues": {
        "ko": "발견된 주요 접근성 문제가 없습니다.",
        "en": "No major accessibility issues were found.",
    },
}
