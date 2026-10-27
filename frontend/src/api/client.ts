// (한국어 요약) 백엔드 API 호출 함수 모음 (fetch 래퍼).
// 모든 요청은 vite proxy를 통해 /api 경로로 전달됨. 공통 에러 처리도 여기서 담당.
// 로그인 사용자 전용 요청은 Authorization: Bearer <token> 헤더로 세션 토큰을 전달.
// 토큰은 authStore 메모리에만 보관 (localStorage/sessionStorage/쿠키 사용 금지, 규칙 1).
import type {
  CvdType,
  DeveloperAnalysis,
  ElementInput,
  HistoryItem,
  ImageAnalysis,
  Lang,
  User,
} from './types'

// 공통 응답 처리: JSON 파싱 + 에러 변환
async function handle<T>(res: Response): Promise<T> {
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    // Server returned HTML (proxy error, timeout page, etc.)
    // (한국어) 서버가 JSON이 아닌 HTML을 반환한 경우 = 백엔드가 꺼져 있거나 프록시 오류
    throw new Error('서버에 연결하지 못했습니다. 백엔드가 실행 중인지 확인해주세요.')
  }
  if (!res.ok) {
    // 백엔드가 보낸 {"code", "message"} 형식의 에러 메시지를 그대로 사용
    const msg = (body as { message?: string })?.message
    throw new Error(msg ?? '요청을 처리하지 못했습니다.')
  }
  return body as T
}

// 로그인 전용 요청에 붙일 인증 헤더. 토큰이 없으면 빈 객체 (비로그인 요청).
function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 이미지 분석 요청: FormData로 파일 + 옵션을 전송 (POST /api/analysis/image)
// 토큰이 있으면(로그인 상태) 결과를 DB에 저장하도록 백엔드에 전달.
export async function analyzeImage(
  file: File,
  cvdType: CvdType,
  mode: 'user' | 'developer',
  lang: Lang,
  token: string | null = null,
): Promise<ImageAnalysis> {
  const form = new FormData()
  form.append('file', file)
  form.append('cvd_type', cvdType)
  form.append('mode', mode)
  form.append('lang', lang)
  return handle(await fetch('/api/analysis/image', {
    method: 'POST',
    headers: authHeaders(token),  // FormData는 Content-Type을 자동 설정하므로 넣지 않음
    body: form,
  }))
}

// 코드 분석 요청: 추출된 요소 목록을 JSON으로 전송 (POST /api/developer/analyze)
// 토큰이 있으면 결과를 DB에 저장.
export async function analyzeElements(
  elements: ElementInput[],
  cvdType: CvdType,
  lang: Lang,
  token: string | null = null,
): Promise<DeveloperAnalysis> {
  return handle(await fetch('/api/developer/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ cvd_type: cvdType, elements, lang }),
  }))
}

// AI 설명 응답의 형태: source가 'fallback'이면 AI 없이 템플릿 문구로 응답된 것
export interface Explanation {
  source: 'ai' | 'fallback'
  summary: string
  issues: { id: number; explanation: string }[]
}

// AI 설명 요청: 분석 결과를 보내 사람이 읽는 요약 문구를 받음 (POST /api/ai/explain)
export async function explain(analysis: object, lang: Lang, mode: 'user' | 'developer') {
  return handle<Explanation>(
    await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, mode, analysis }),
    }),
  )
}

// ===================== 회원 관리 (auth) API =====================
// (한국어) 로그인/회원가입/내정보/히스토리 API 호출 함수.
// 세션 토큰은 메모리(authStore)에만 유지하고 localStorage/쿠키는 쓰지 않음 (규칙 1).

// 로그인 응답: 사용자 정보 + 세션 토큰
export interface LoginResult {
  user: User
  token: string
}

// 회원가입 (POST /api/auth/signup)
export async function signup(input: {
  name: string; email: string; loginId: string; password: string
}): Promise<User> {
  return handle<User>(await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name, email: input.email,
      login_id: input.loginId, password: input.password,
    }),
  }))
}

// ID 중복 확인 (POST /api/auth/check-id) — 회원가입 폼에서 실시간 확인용
export async function checkLoginId(loginId: string): Promise<boolean> {
  const res = await handle<{ available: boolean }>(await fetch('/api/auth/check-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId }),
  }))
  return res.available
}

// 로그인 (POST /api/auth/login) — 사용자 정보와 세션 토큰을 반환
export async function login(loginId: string, password: string): Promise<LoginResult> {
  return handle<LoginResult>(await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId, password }),
  }))
}

// 로그아웃 (POST /api/auth/logout) — 서버 메모리에서 세션 토큰 제거
export async function logout(token: string): Promise<void> {
  await handle<{ code: string; message: string }>(
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(token),
    }),
  )
}

// 내 정보 조회 (GET /api/auth/me)
export async function getMe(token: string): Promise<User> {
  return handle<User>(await fetch('/api/auth/me', { headers: authHeaders(token) }))
}

// 내 정보 수정 (PUT /api/auth/me)
export async function updateProfile(
  token: string,
  patch: { name?: string; email?: string },
): Promise<User> {
  return handle<User>(await fetch('/api/auth/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(patch),
  }))
}

// 비밀번호 변경 (PUT /api/auth/me/password)
export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await handle<{ code: string; message: string }>(
    await fetch('/api/auth/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),
  )
}

// 분석 결과 히스토리 조회 (GET /api/auth/history)
export async function getHistory(token: string): Promise<HistoryItem[]> {
  return handle<HistoryItem[]>(await fetch('/api/auth/history', { headers: authHeaders(token) }))
}

// 히스토리 항목 삭제 (DELETE /api/auth/history/{resultId})
export async function deleteHistoryItem(token: string, resultId: number): Promise<void> {
  await handle<{ code: string; message: string }>(
    await fetch(`/api/auth/history/${resultId}`, { method: 'DELETE', headers: authHeaders(token) }),
  )
}

// 회원 탈퇴 (DELETE /api/auth/me)
export async function deleteAccount(token: string): Promise<void> {
  await handle<{ code: string; message: string }>(
    await fetch('/api/auth/me', { method: 'DELETE', headers: authHeaders(token) }),
  )
}
