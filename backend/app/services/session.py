"""In-memory session token store for auth.

(한국어 요약) 로그인 세션 토큰 저장소 — 서버 메모리에만 유지 (DB/디스크/쿠키 아님).
- 로그인 성공 시 토큰을 발급하고 {토큰: user_id} 매핑을 메모리 dict에 보관
- 보호 엔드포인트는 Authorization: Bearer <token> 헤더로 현재 사용자를 식별
- 서버 재시작·프로세스 종료 시 모든 세션이 소멸 (의도적 — 영속 세션 금지)

설계 배경: 기존엔 user_id를 URL 경로로 받아 타 사용자 데이터 열람이 가능했던 인가 취약점을
닫기 위해 도입. JWT가 아닌 단순 in-memory 불투명 토큰(opaque token)으로, 단일 인스턴스
학교 프로젝트 규모에 맞춤. 프로덕션(다중 인스턴스·영속 세션)은 Redis/JWT 등 필요.
"""
import secrets
import threading
from datetime import UTC, datetime, timedelta

# 서버 메모리에만 존재하는 세션 테이블. 딕셔너리는 스레드 안전하지 않으므로 락으로 보호.
_sessions: dict[str, dict] = {}
_lock = threading.Lock()

# 세션 유효 기간. 서버를 재시작하지 않아도 오래된 세션은 자연 만료시킨다.
SESSION_TTL = timedelta(hours=12)


def create_session(user_id: int) -> str:
    """user_id에 대해 새 세션 토큰을 발급해 메모리에 저장하고 토큰을 반환."""
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    with _lock:
        # 만료된 세션은 발급 시 함께 정리 (lazy cleanup)
        _purge_expired_locked(now)
        _sessions[token] = {"user_id": user_id, "expires_at": now + SESSION_TTL}
    return token


def get_user_id(token: str | None) -> int | None:
    """토큰으로 user_id를 조회. 없거나 만료됐으면 None."""
    if not token:
        return None
    now = datetime.now(UTC)
    with _lock:
        session = _sessions.get(token)
        if not session:
            return None
        if session["expires_at"] < now:
            _sessions.pop(token, None)
            return None
        return session["user_id"]


def destroy_session(token: str | None) -> None:
    """로그아웃 시 토큰을 메모리에서 제거."""
    if not token:
        return
    with _lock:
        _sessions.pop(token, None)


def clear_all_sessions() -> None:
    """서버 종료/테스트 격리용 — 모든 세션 제거."""
    with _lock:
        _sessions.clear()


def _purge_expired_locked(now: datetime) -> None:
    """(락 획득 전제) 만료된 세션을 일괄 삭제."""
    expired = [t for t, s in _sessions.items() if s["expires_at"] < now]
    for t in expired:
        _sessions.pop(t, None)
