"""Database engine and session setup (SQLAlchemy 2.0 + SQLite).

(한국어 요약) 데이터베이스 연결과 세션 관리를 담당하는 모듈.
- SQLite 파일 기반 DB 엔진을 생성하고, 요청마다 독립된 세션을 제공
- FastAPI 의존성 주입(get_db)으로 라우터에 세션을 전달
- WAL 모드를 켜서 읽기 동시성을 확보 (학교 프로젝트 트래픽에 충분)
"""
from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase

from .config import settings

# SQLite 엔진 생성. check_same_thread=False: FastAPI의 스레드 풀에서도 세션을 쓸 수 있게.
# (한국어) SQLite는 기본적으로 같은 스레드에서만 접근을 허용하지만, FastAPI는 요청을
# 여러 스레드에서 처리하므로 이 제한을 풀어야 함.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,  # True로 바꾸면 SQL 쿼리가 콘솔에 찍힘 (디버깅용)
)

# 세션 팩토리: 세션 객체를 만들어내는 생성기. 만료 시 자동 커밋/롤백은 호출 측에서 제어.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


# SQLite WAL(Write-Ahead Logging) 모드 활성화.
# (한국어) 기본 모드에서는 쓰기 중에 읽기가 막히지만, WAL을 쓰면 읽기는 무제한 허용되고
# 쓰기만 직렬화됨. 학교 프로젝트 규모에서 동시성 이슈를 사전에 방지.
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")     # 동시성 향상
    cursor.execute("PRAGMA foreign_keys=ON")      # 외래키 제약 조건 활성화 (SQLite는 기본 OFF)
    cursor.close()


# 모든 ORM 모델이 상속할 공통 Base 클래스 (SQLAlchemy 2.0 스타일)
class Base(DeclarativeBase):
    pass


# FastAPI 의존성: 요청이 들어올 때마다 세션을 하나 만들어 라우터에 주입하고,
# 요청이 끝나면 세션을 닫아줌. yield 패턴으로 자원을 안전하게 정리.
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
