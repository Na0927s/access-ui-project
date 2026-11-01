"""App settings and analysis thresholds.

Thresholds marked TBD must be tuned by the team with sample UIs (see docs/11_TRD.md).

(한국어 요약) 앱 설정값과 분석 임계값을 모아둔 파일.
- .env 파일에서 ANTHROPIC_API_KEY, ALLOWED_ORIGINS 등을 읽어옴
- 업로드 제한, 팔레트 추출 옵션, WCAG 기준, 색상 혼동 판정 임계값을 정의
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # .env 파일에서 값을 읽음. 정의되지 않은 환경변수는 무시(extra="ignore")
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""                            # AI 설명용 키 (없어도 핵심 분석 동작)
    anthropic_model: str = "claude-sonnet-4-20250514"      # 사용할 Claude 모델
    allowed_origins: str = "http://localhost:5176"         # CORS 허용 출처 (쉼표로 여러 개 가능)
    # SQLite 파일 경로. 로컬은 ./colorlens.db, 배포(Render 등)는 영구 디스크 마운트 경로로 override.
    # Render 예: DATABASE_URL=sqlite:////var/data/colorlens.db (영구 디스크 /var/data)
    database_url: str = "sqlite:///./colorlens.db"
    # 정적 파일(빌드된 프론트엔드) 서빙 디렉터리. 배포 시 백엔드가 프론트를 함께 서빙하도록 설정.
    # 빈 문자열이면 정적 서빙하지 않음 (개발 모드: 프론트는 별도 vite 서버).
    static_dir: str = ""

    @property
    def origins(self) -> list[str]:
        # "a, b" 처럼 쉼표로 묶인 문자열을 공백 제거 후 리스트로 변환
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def ai_enabled(self) -> bool:
        # API 키가 있어야만 AI 기능 사용 가능
        return bool(self.anthropic_api_key)


# 전역에서 공유하는 설정 싱글턴 인스턴스
settings = Settings()

# --- 업로드 제한 (프론트엔드 안내 문구와 동일한 기준) ---
MAX_UPLOAD_BYTES = 10 * 1024 * 1024      # 10MB
MAX_IMAGE_PIXELS = 40_000_000            # DecompressionBomb(압축폭탄) 방지용 최대 픽셀 수
ALLOWED_FORMATS = {"PNG", "JPEG"}        # Pillow가 인식하는 포맷 이름
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}  # HTTP Content-Type

# --- 리사이즈/팔레트 제한 (성능을 위해 이미지를 축소해서 처리) ---
SIMULATION_MAX_SIDE = 1200        # 시뮬레이션 결과 이미지의 최대 가로·세로 길이
PALETTE_MAX_SIDE = 400            # 팔레트 추출용 축소 크기 (400px이면 색 분포 파악에 충분)
PALETTE_MAX_COLORS = 8           # 결과에 보여줄 주요 색상 개수 상한
PALETTE_MIN_RATIO = 0.005         # 화면의 0.5% 미만으로 차지하는 색상은 무시
PALETTE_MERGE_DISTANCE = 3.0  # temporary Delta E value (TBD per design doc) — 비슷한 색 병합 기준 ΔE
CONTRAST_PAIR_MIN_RATIO = 0.01    # 대비 검사에 포함할 색상의 최소 비율 (1%)

# --- WCAG AA 기준 (디자인 문서의 알고리즘 규칙) ---
WCAG_NORMAL = 4.5     # 일반 텍스트 최소 대비율
WCAG_LARGE = 3.0      # 큰 텍스트 최소 대비율
WCAG_UI = 3.0         # UI 컴포넌트(테두리·아이콘 등) 최소 대비율
WCAG_AAA_NORMAL = 7.0 # AAA(강화) 기준 — 추천 색상 등급 판정에 사용

# --- 전체 판정 점수 구간 (scoring.score_to_verdict) ---
# 점수와 판정이 일치하도록 점수 구간 기반으로 전체 판정을 산출.
# (한국어) 전체 판정 점수 구간 — 90↑ PASS, 70~89 WARNING, 70 미만 FAIL.
# 이전 "이슈 1개라도 있으면 FAIL" 이분법의 모순(95점 FAIL)을 해소.
VERDICT_PASS_SCORE = 90     # 이 점수 이상이면 PASS
VERDICT_WARN_SCORE = 70     # 이 점수 이상(PASS 미만)이면 WARNING, 미만이면 FAIL

# Color confusion thresholds in Delta E (CIE76). TBD per the design doc — the values
# below are temporary placeholders based on common Delta E guidance
# (~2.3 JND, <5 hard to distinguish, 5-10 marginal, >10 clearly distinct).
# The team must tune them with sample UIs before treating them as final.
# (한국어) 색상 혼동 판정 임계값 — 아래 값들은 임시치이며 팀이 샘플 UI로 튜닝해야 함.
# ΔE 참고: 약 2.3 = JND(just noticeable difference, 겨우 구분됨) / 5 미만 = 구분 어려움
#          5~10 = 애매함 / 10 초과 = 명확히 구분됨
DISTINCT_MIN = 10.0   # 원본에서도 이 값 미만이면 애초에 비슷한 색 → CVD 문제로 보지 않음
CONFUSION_FAIL = 5.0  # 시뮬레이션 후 ΔE가 이 값 미만이면 FAIL (구분 거의 불가)
CONFUSION_WARN = 8.0  # 시뮬레이션 후 ΔE가 이 값 미만이면 WARNING (구분 애매)

# Ratio-based confusion detection (complements the absolute thresholds above).
# CIE76 ΔE overestimates the residual distance after CVD hue collapse, so a
# saturated red/green pair (which deutan simulation should collapse) still shows
# a large d_sim and slips through as PASS. A pair is confusing when the
# simulation collapses MOST of the original distance AND the residual is small.
# (한국어) 비율 기반 혼동 판정 — 위 절대 임계값을 보완.
# CIE76 ΔE는 색조 붕괴 후 잔여 거리를 과대평가해, deutan이 붕괴시켜야 할
# 빨강/녹색 쌍도 d_sim이 크게 나와 PASS로 빠지는 문제가 있음.
# 시뮬레이션이 원본 거리의 대부분을 붕괴시키고 잔여도 작으면 혼동으로 본다.
CONFUSION_FAIL_RATIO = 0.25    # 거리가 원본의 25% 이하로 붕괴 + 잔여 작으면 FAIL
CONFUSION_WARN_RATIO = 0.50    # 거리가 원본의 50% 이하로 붕괴 + 잔여 작으면 WARNING
CONFUSION_FAIL_ABS_MAX = 20.0  # FAIL 판정을 위한 잔여 ΔE 상한 (비율 조건과 AND)
CONFUSION_WARN_ABS_MAX = 30.0  # WARNING 판정을 위한 잔여 ΔE 상한 (비율 조건과 AND)
