"""Auth router: signup, login, user info, profile update, history.

(한국어 요약) 회원 관리 API — 회원가입, 로그인, 내 정보 조회/수정, 결과 히스토리 조회.
- 비밀번호는 bcrypt 해시로만 저장 (평문 금지, 규칙 2)
- 로그인 성공 시 서버 메모리에 세션 토큰을 발급하고 응답에 포함
- 보호 엔드포인트는 Authorization: Bearer <token> 헤더로 현재 사용자를 식별
  (user_id를 경로로 받지 않아 타 사용자 데이터 열람 불가 — 인가 취약점 해결)
- 분석 결과 히스토리는 로그인 사용자만 조회 가능 (비로그인은 401)

주의: in-memory 세션이므로 서버 재시작 시 모든 로그인이 풀림 (의도적 — 영속 세션 금지).
다중 인스턴스·영속 세션이 필요한 프로덕션은 Redis/JWT 등으로 교체 필요.
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import api_error
from ..models import AnalysisResult, User
from ..services.persistence import serialize_history_item
from ..services.security import hash_password, verify_password
from ..services.session import create_session, destroy_session, get_user_id

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- 요청 스키마 (Pydantic) ---

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    email: EmailStr
    login_id: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    login_id: str
    password: str


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# --- 응답 스키마 ---

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    login_id: str


class LoginResponse(BaseModel):
    """로그인 응답: 사용자 정보 + 세션 토큰. 프론트는 토큰을 메모리에만 보관."""
    user: UserResponse
    token: str


# --- 인증 의존성 ---

def _extract_token(authorization: str | None) -> str | None:
    """Authorization 헤더에서 Bearer 토큰을 추출. 형식이 맞지 않으면 None."""
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def current_user_id(authorization: str | None = Header(default=None)) -> int:
    """보호 엔드포인트 의존성 — 토큰을 검증해 현재 로그인한 user_id를 반환.
    토큰이 없거나 유효하지 않으면 401."""
    token = _extract_token(authorization)
    user_id = get_user_id(token)
    if user_id is None:
        raise api_error("UNAUTHORIZED")
    return user_id


# --- 엔드포인트 ---

@router.post("/signup", response_model=UserResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """회원가입. 중복 login_id/email은 거부한다. 가입 후 별도 로그인 필요."""
    # login_id 중복 확인
    if db.scalar(select(User).where(User.login_id == req.login_id)):
        raise HTTPException(409, {"code": "DUPLICATE_LOGIN_ID", "message": "이미 사용 중인 ID입니다."})
    # email 중복 확인
    if db.scalar(select(User).where(User.email == req.email)):
        raise HTTPException(409, {"code": "DUPLICATE_EMAIL", "message": "이미 가입된 이메일입니다."})

    user = User(
        name=req.name,
        email=req.email,
        login_id=req.login_id,
        password_hash=hash_password(req.password),  # 평문 절대 저장 금지
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(id=user.id, name=user.name, email=user.email, login_id=user.login_id)


class CheckIdRequest(BaseModel):
    login_id: str = Field(min_length=3, max_length=64)


@router.post("/check-id")
def check_login_id(req: CheckIdRequest, db: Session = Depends(get_db)):
    """ID 중복 확인 (회원가입 폼용). 사용 가능하면 available=true."""
    taken = db.scalar(select(User).where(User.login_id == req.login_id)) is not None
    return {"available": not taken}


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """로그인. login_id + 비밀번호 검증 후 사용자 정보와 세션 토큰을 반환.
    토큰은 서버 메모리에만 저장되고 클라이언트 메모리에만 보관된다 (디스크/쿠키 금지)."""
    user = db.scalar(select(User).where(User.login_id == req.login_id))
    # 사용자가 없거나 비밀번호가 틀리면 동일한 메시지로 응답 (계정 열거 공격 방지)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "ID 또는 비밀번호가 올바르지 않습니다."})
    token = create_session(user.id)  # 메모리 세션 발급
    return LoginResponse(
        user=UserResponse(id=user.id, name=user.name, email=user.email, login_id=user.login_id),
        token=token,
    )


@router.post("/logout")
def logout(user_id: int = Depends(current_user_id), authorization: str | None = Header(default=None)):
    """로그아웃 — 서버 메모리에서 세션 토큰을 제거. 클라이언트 토큰도 폐기된다."""
    destroy_session(_extract_token(authorization))
    return {"code": "OK", "message": "로그아웃되었습니다."}


@router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    """내 정보 조회. user_id는 토큰에서 추출하므로 타 사용자 정보 열람 불가."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "사용자를 찾을 수 없습니다."})
    return UserResponse(id=user.id, name=user.name, email=user.email, login_id=user.login_id)


@router.put("/me", response_model=UserResponse)
def update_profile(req: UpdateProfileRequest, user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    """내 정보 수정 (이름, 이메일). login_id는 변경 불가."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "사용자를 찾을 수 없습니다."})

    if req.email is not None and req.email != user.email:
        # 이메일 변경 시 중복 확인
        if db.scalar(select(User).where(User.email == req.email, User.id != user_id)):
            raise HTTPException(409, {"code": "DUPLICATE_EMAIL", "message": "이미 가입된 이메일입니다."})
        user.email = req.email
    if req.name is not None:
        user.name = req.name

    db.commit()
    db.refresh(user)
    return UserResponse(id=user.id, name=user.name, email=user.email, login_id=user.login_id)


@router.put("/me/password")
def change_password(req: ChangePasswordRequest, user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    """비밀번호 변경. 현재 비밀번호 검증 후 새 비밀번호(bcrypt)로 교체."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "사용자를 찾을 수 없습니다."})
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(401, {"code": "INVALID_CREDENTIALS", "message": "현재 비밀번호가 올바르지 않습니다."})
    user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"code": "OK", "message": "비밀번호가 변경되었습니다."}


@router.get("/history")
def get_history(user_id: int = Depends(current_user_id), limit: int = 50, db: Session = Depends(get_db)):
    """로그인 사용자의 분석 결과 히스토리. 최신순 최대 limit건. 본인 것만 조회 가능."""
    rows = db.scalars(
        select(AnalysisResult)
        .where(AnalysisResult.user_id == user_id)
        .order_by(AnalysisResult.created_at.desc())
        .limit(limit)
    ).all()
    return [serialize_history_item(r) for r in rows]


@router.delete("/history/{result_id}")
def delete_history_item(result_id: int, user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    """히스토리 항목 하나 삭제. 본인 소유만 삭제 가능 (user_id는 토큰에서 추출)."""
    row = db.get(AnalysisResult, result_id)
    if not row or row.user_id != user_id:
        raise HTTPException(404, {"code": "NOT_FOUND", "message": "삭제할 결과를 찾을 수 없습니다."})
    db.delete(row)
    db.commit()
    return {"code": "OK", "message": "삭제되었습니다."}


@router.delete("/me")
def delete_account(user_id: int = Depends(current_user_id), db: Session = Depends(get_db), authorization: str | None = Header(default=None)):
    """회원 탈퇴. 사용자와 모든 분석 결과를 함께 삭제 (cascade). 세션도 함께 폐기."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, {"code": "USER_NOT_FOUND", "message": "사용자를 찾을 수 없습니다."})
    db.delete(user)
    db.commit()
    destroy_session(_extract_token(authorization))  # 세션 토큰도 함께 제거
    return {"code": "OK", "message": "탈퇴 처리되었습니다."}
