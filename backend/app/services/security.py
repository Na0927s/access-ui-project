"""Password hashing and verification with bcrypt directly.

(한국어 요약) 비밀번호 해싱/검증 유틸.
- 회원가입 시: 평문 비밀번호를 bcrypt 해시로 변환해 DB에 저장 (평문 절대 저장 금지, 규칙 2)
- 로그인 시: 저장된 해시와 입력값을 bcrypt로 검증
- passlib 대신 bcrypt를 직접 사용해 의존성·호환성 경고를 줄임
- bcrypt는 입력을 72바이트로 자르므로, 그보다 긴 비밀번호는 미리 잘라준다
  (비밀번호 정책상 128자 제한이므로 72바이트 초과 분은 무시해도 안전)
"""
import bcrypt

# bcrypt는 72바이트 초과 입력을 거부하므로 미리 잘라낸다. UTF-8 인코딩.
# (한국어) 비밀번호가 72바이트(한글 약 24자, 영문 72자)보다 길면 초과분은 무시.
_BCRYPT_MAX_BYTES = 72


def _encode(plain: str) -> bytes:
    # 문자열을 UTF-8 바이트로 변환 후 72바이트로 제한
    return plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(plain: str) -> str:
    """평문 비밀번호를 bcrypt 해시로 변환. DB에는 이 값만 저장한다."""
    salt = bcrypt.gensalt(rounds=12)  # rounds=12: 보안과 성능의 균형점
    return bcrypt.hashpw(_encode(plain), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """입력한 평문 비밀번호가 저장된 해시와 일치하는지 검증. 일치하면 True."""
    try:
        return bcrypt.checkpw(_encode(plain), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # 해시 포맷이 잘못된 경우 등 — 검증 실패로 처리
        return False
