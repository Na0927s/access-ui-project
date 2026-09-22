import numpy as np
from PIL import Image

from app.services.color import cielab_to_hex, delta_e, hex_to_cielab
from app.services.cvd import simulate_hex, simulate_image

TYPES = ("protan", "deutan", "tritan")
RED, GREEN = "#EF4444", "#22C55E"


def _channel_diff(a: str, b: str) -> int:
    return max(abs(int(a[i:i + 2], 16) - int(b[i:i + 2], 16)) for i in (1, 3, 5))


def test_white_and_black_unchanged():
    for t in TYPES:
        assert _channel_diff(simulate_hex("#FFFFFF", t), "#FFFFFF") <= 1
        assert _channel_diff(simulate_hex("#000000", t), "#000000") <= 1


def test_red_green_become_confusable_for_protan_deutan():
    original = delta_e(RED, GREEN)
    # Deutan: hue difference nearly vanishes.
    deutan = delta_e(simulate_hex(RED, "deutan"), simulate_hex(GREEN, "deutan"))
    assert deutan < original * 0.3
    # Protan: red is perceived darker, so a lightness gap remains, but distance still drops.
    protan = delta_e(simulate_hex(RED, "protan"), simulate_hex(GREEN, "protan"))
    assert protan < original * 0.8


def test_tritan_keeps_red_green_distinct():
    tritan = delta_e(simulate_hex(RED, "tritan"), simulate_hex(GREEN, "tritan"))
    # Clearly distinct on the Delta E (CIE76) scale: well above the ~2.3 JND.
    assert tritan > 30


def test_image_size_and_alpha_preserved():
    img = Image.new("RGBA", (40, 30), (255, 0, 0, 128))
    for t in TYPES:
        out = simulate_image(img, t)
        assert out.size == (40, 30)
        assert out.mode == "RGBA"
        assert np.asarray(out)[0, 0, 3] == 128


def test_cielab_roundtrip():
    for c in ("#FFFFFF", "#000000", "#EF4444", "#22C55E", "#4F46E5", "#767676"):
        assert cielab_to_hex(hex_to_cielab(c)) == c
    # L* of reference white is 100 and of black is 0 by definition.
    assert abs(hex_to_cielab("#FFFFFF")[0] - 100.0) < 0.5
    assert abs(hex_to_cielab("#000000")[0]) < 1e-6
