"""Accessibility score (draft formula — TBD by the team). Not an official WCAG score."""


def calculate_score(contrast_verdicts: list[str], confusion_verdicts: list[str]) -> int:
    score = 100
    score -= 15 * contrast_verdicts.count("FAIL")
    score -= 5 * contrast_verdicts.count("WARNING")
    score -= 10 * confusion_verdicts.count("FAIL")
    score -= 4 * confusion_verdicts.count("WARNING")
    return max(0, min(100, score))
