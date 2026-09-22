import pytest

from app.services.wcag import contrast_ratio, is_large_text, judge


@pytest.mark.parametrize("fg,bg,expected", [
    ("#000000", "#FFFFFF", 21.00),
    ("#FFFFFF", "#FFFFFF", 1.00),
    ("#767676", "#FFFFFF", 4.54),
    ("#777777", "#FFFFFF", 4.48),
    ("#FFFFFF", "#FF0000", 4.00),
])
def test_contrast_reference_values(fg, bg, expected):
    assert round(contrast_ratio(fg, bg), 2) == expected


def test_contrast_is_symmetric():
    assert contrast_ratio("#123456", "#ABCDEF") == contrast_ratio("#ABCDEF", "#123456")


def test_judge():
    assert judge(4.54)["verdict"] == "PASS"
    assert judge(4.48)["verdict"] == "WARNING"   # large text only
    assert judge(2.5)["verdict"] == "FAIL"


def test_large_text():
    assert is_large_text(24, 400)
    assert is_large_text(19, 700)
    assert not is_large_text(16, 700)
    assert not is_large_text(None, None)
