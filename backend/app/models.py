"""ORM models for users, analysis results, and analysis cache.

(한국어 요약) DB 테이블을 파이썬 클래스로 정의하는 모델 모음 (SQLAlchemy 2.0).
- User: 회원 정보. 비밀번호는 bcrypt 해시로만 저장 (평문 금지, 규칙 2).
- AnalysisResult: 로그인 사용자의 분석 결과 히스토리. 비로그인은 저장하지 않음 (규칙 1).
- AnalysisCache: 같은 이미지 재분석 시 캐시로 활용. 이미지 바이트가 아닌 해시만 저장 (규칙 3).

설계 원칙:
- 이미지 바이트는 어떤 테이블에도 저장하지 않는다. 캐시 키로 SHA-256 해시만 쓴다.
- 비로그인 분석 결과는 AnalysisResult에 쓰지 않는다 (user_id NOT NULL).
- 분석 결과는 통계·히스토리 용도로 영속화하되, 결과 안의 시뮬레이션 이미지 base64는
  용량과 프라이버시를 고려해 별도 컬럼 보관 여부를 설정으로 조절 가능 (기본: 메타만).
"""
from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    """회원 계정. 비밀번호는 bcrypt 해시로 저장한다."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)                       # 표시명
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    login_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)             # bcrypt 해시
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC), nullable=False)

    # 1:N — 한 사용자는 여러 분석 결과를 가질 수 있음
    results: Mapped[list["AnalysisResult"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} login_id={self.login_id}>"


class AnalysisResult(Base):
    """로그인 사용자의 분석 결과. 비로그인은 저장하지 않는다 (규칙 1)."""

    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(16), nullable=False)        # "user" | "developer"
    cvd_type: Mapped[str] = mapped_column(String(16), nullable=False)    # "protan" | "deutan" | "tritan"
    # 이미지 메타(파일명·크기·해상도)만 저장, 바이트는 절대 저장하지 않는다 (규칙 3)
    input_meta: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)    # 자체 지표 점수 (0~100)
    verdict: Mapped[str] = mapped_column(String(16), nullable=False)     # "PASS" | "WARNING" | "FAIL"
    # 전체 분석 결과를 JSON 문자열로 저장. 시뮬레이션 base64 포함 여부는 호출 측에서 결정.
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now(UTC), nullable=False, index=True
    )

    user: Mapped["User"] = relationship(back_populates="results")

    def __repr__(self) -> str:
        return f"<AnalysisResult id={self.id} user_id={self.user_id} verdict={self.verdict}>"


class AnalysisCache(Base):
    """분석 캐시. 같은 이미지(해시) + 같은 색약 유형이면 재분석 없이 결과 재사용.

    이미지 바이트가 아닌 SHA-256 해시만 키로 저장 (규칙 3 준수).
    비로그인 분석에도 캐시는 적용 가능 (속도 향상 목적, 개인정보 아님).
    """

    __tablename__ = "analysis_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    image_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # SHA-256 hex
    cvd_type: Mapped[str] = mapped_column(String(16), nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False)        # "user" | "developer" — 캐시 키에 포함
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC), nullable=False)

    # (image_hash, cvd_type, mode) 복합 유니크 — 같은 조합은 한 줄만 유지.
    # mode가 키에 포함되어야 user/developer 모드 결과가 서로 덮어쓰이지 않음.
    __table_args__ = (
        Index("ix_cache_hash_cvd_mode", "image_hash", "cvd_type", "mode", unique=True),
    )

    def __repr__(self) -> str:
        return f"<AnalysisCache hash={self.image_hash[:8]}... cvd={self.cvd_type}>"
