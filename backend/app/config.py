"""App settings and analysis thresholds.

Thresholds marked TBD must be tuned by the team with sample UIs (see docs/11_TRD.md).
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"
    allowed_origins: str = "http://localhost:5173"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.anthropic_api_key)


settings = Settings()

# Upload limits
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
ALLOWED_FORMATS = {"PNG", "JPEG"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}

# Resize limits
SIMULATION_MAX_SIDE = 1200
PALETTE_MAX_SIDE = 400
PALETTE_MAX_COLORS = 8
PALETTE_MIN_RATIO = 0.005
PALETTE_MERGE_DISTANCE = 3.0  # temporary Delta E value (TBD per design doc)
CONTRAST_PAIR_MIN_RATIO = 0.01

# WCAG AA
WCAG_NORMAL = 4.5
WCAG_LARGE = 3.0
WCAG_UI = 3.0
WCAG_AAA_NORMAL = 7.0

# Color confusion thresholds in Delta E (CIE76). TBD per the design doc — the values
# below are temporary placeholders based on common Delta E guidance
# (~2.3 JND, <5 hard to distinguish, 5-10 marginal, >10 clearly distinct).
# The team must tune them with sample UIs before treating them as final.
DISTINCT_MIN = 10.0
CONFUSION_FAIL = 5.0
CONFUSION_WARN = 8.0

SCORE_NOTICE = (
    "접근성 점수는 본 서비스의 분석 항목을 기반으로 산출한 자체 평가 지표이며 "
    "공식 WCAG 인증 점수가 아닙니다."
)
