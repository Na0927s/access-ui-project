"""Bilingual result message templates (design doc section 6/7 example sentences).

Korean is the default language; English is returned when the frontend requests
lang="en". This works without any AI API key — /api/ai/* remains an optional
polish layer on top.

(한국어 요약) 분석 결과에 들어가는 안내 문구 템플릿 모음 (한/영 두 언어).
- AI 없이도 언어 전환이 되도록, AI는 여기 있는 문구를 다듬는 보조 역할만 함
- {fg}, {bg}, {ratio} 등 중괄호 부분은 .format()으로 실제 값이 채워짐
"""

# 색약 유형별 표시 이름
CVD_LABELS = {
    "protan": {"ko": "적색 계열", "en": "red-type"},
    "deutan": {"ko": "녹색 계열", "en": "green-type"},
    "tritan": {"ko": "청색 계열", "en": "blue-type"},
}

# 이미지 분석의 전체(종합) 판정 안내 문구 — 일반인도 이해하기 쉬운 표현
RESULT_MESSAGES = {
    "PASS": {
        "ko": "선택한 색각이상 환경에서도 색들이 비교적 잘 구분됩니다. 큰 문제는 없어요.",
        "en": "Colors stay relatively distinguishable under the selected color vision deficiency. No major issues.",
    },
    "WARNING": {
        "ko": "일부 색이 색각이상 환경에서는 겹쳐 보일 수 있어요. 아래에서 어떤 색인지 확인해 보세요.",
        "en": "Some colors may overlap under color vision deficiency. See below for which ones.",
    },
    "FAIL": {
        "ko": "여러 색이 선택한 색각이상 환경에서 잘 구분되지 않을 수 있어요. 아래 안내를 따라 바꿔보는 걸 권해요.",
        "en": "Multiple colors may be hard to tell apart for the selected deficiency type. Following the guidance below is recommended.",
    },
}

# 저대비(대비율 미달) 이슈 문구 — 모드별: 사용자는 쉽게(HEX/비율 없음), 개발자는 기술적으로.
# 사용자 모드는 색 칩이 옆에 표시되므로 "이 두 색"으로 지칭. 행동을 구체적으로 안내.
LOW_CONTRAST_ISSUE = {
    "user": {
        "ko": "이 두 색의 밝고 어두움 차이가 충분하지 않아, 글자가 배경에 묻혀 잘 안 보일 수 있어요. "
              "글자색을 더 진하게 하거나 배경을 바꿔보세요.",
        "en": "These two colors don't differ enough in lightness, so the text may blend into the background. "
              "Try making the text darker or changing the background.",
    },
    "developer": {
        "ko": "{fg}와 {bg}의 대비율이 {ratio}:1로 일반 텍스트 기준(4.5:1)에 미달합니다.",
        "en": "The contrast between {fg} and {bg} is {ratio}:1, below the normal-text criterion (4.5:1).",
    },
}

# 색상 혼동 이슈 문구 — 모드별. {label}=색약 유형명, {a}/{b}=두 색상(개발자 모드만 사용)
# 사용자 모드는 "이 두 색"으로 지칭하고 색으로만 정보 전달할 때의 위험을 쉽게 설명.
COLOR_CONFUSION_ISSUE = {
    "user": {
        "ko": "{label} 환경에서는 이 두 색이 비슷하게 보여 헷갈릴 수 있어요. "
              "색으로만 정보를 알려준다면 아이콘이나 글자를 함께 표시하는 것이 좋아요.",
        "en": "Under {label} vision, these two colors can look similar and be confusing. "
              "If color alone carries the meaning, it helps to also add an icon or text label.",
    },
    "developer": {
        "ko": "{label} 색각이상 환경에서 {a}와 {b}의 구분이 어려울 가능성이 있습니다. "
              "색상만으로 정보를 전달한다면 아이콘이나 텍스트를 함께 사용하세요.",
        "en": "Under {label} color vision deficiency, {a} and {b} may be hard to tell apart. "
              "If color alone conveys the information, add icons or text as well.",
    },
}

# 개발자 모드(코드 분석) 전체 판정 문구 — {failed}=미달 요소 수
DEV_RESULT = {
    "PASS": {
        "ko": "모든 요소가 색상 대비 기준을 통과했습니다.",
        "en": "All elements passed the color-contrast criteria.",
    },
    "WARNING": {
        "ko": "{failed}개 요소가 기준에 미달했습니다. 아래 문제 해결 방법을 확인하세요.",
        "en": "{failed} elements fell below the criteria. See the fixes below.",
    },
    "FAIL": {
        "ko": "{failed}개 요소가 기준에 미달했습니다. 아래 문제 해결 방법을 확인하세요.",
        "en": "{failed} elements fell below the criteria. See the fixes below.",
    },
}

# 개발자 모드 문제 카드: 대비율 미달 문제 문구 — {ratio}=대비율, {need}=적용 기준
DEV_CONTRAST_PROBLEM = {
    "ko": "텍스트 대비율 {ratio}:1로 기준({need})에 미달합니다.",
    "en": "The text contrast ratio {ratio}:1 falls below the criterion ({need}).",
}

# 큰 텍스트 요소에게 안내할 적용 기준 문구
NEED_LARGE = {"ko": "3:1(큰 텍스트)", "en": "3:1 large text"}

# 개발자 모드 문제 카드: 색 변경 외 추가 개선 팁 (대비율 미달용)
DEV_CONTRAST_TIP = {
    "ko": "색 변경만으로 어렵다면 배경색을 조정하거나 굵기·크기를 키우세요.",
    "en": "If a color change alone is not enough, adjust the background or increase the weight/size.",
}

# 추천 색상 등급별 이유 설명
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

# 색 이외의 개선 방법 팁 (색상 구분이 어려울 때 모양·텍스트로 보완)
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

# AI 설명 요청이 실패했을 때 쓰는 기본(fallback) 문구 — 일반인도 이해하기 쉬운 표현
FALLBACK_EXPLAIN = {
    "issues": {
        "ko": "선택한 색각이상 환경에서 {count}곳의 색이 서로 잘 구분되지 않을 수 있어요. 아래에서 어떤 색이 겹쳐 보이는지와 바꿔볼 수 있는 색을 확인해 보세요.",
        "en": "Under the selected color vision deficiency, {count} spot(s) may be hard to tell apart. See below for which colors overlap and suggested alternatives.",
    },
    "no_issues": {
        "ko": "선택한 색각이상 환경에서도 색들이 비교적 잘 구분됩니다. 큰 문제는 발견되지 않았어요.",
        "en": "Colors stay relatively distinguishable under the selected color vision deficiency. No major issues were found.",
    },
}
