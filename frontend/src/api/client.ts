// (한국어 요약) 백엔드 API 호출 함수 모음 (fetch 래퍼).
// 모든 요청은 vite proxy를 통해 /api 경로로 전달됨. 공통 에러 처리도 여기서 담당.
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

// 이미지 분석 요청: FormData로 파일 + 옵션을 전송 (POST /api/analysis/image)
// userId가 있으면(로그인 상태) 결과를 DB에 저장하도록 백엔드에 전달.
export async function analyzeImage(
  file: File,
  cvdType: CvdType,
  mode: 'user' | 'developer',
  lang: Lang,
  userId?: number,
): Promise<ImageAnalysis> {
  const form = new FormData()
  form.append('file', file)
  form.append('cvd_type', cvdType)
  form.append('mode', mode)
  form.append('lang', lang)
  if (userId !== undefined) form.append('user_id', String(userId))
  return handle(await fetch('/api/analysis/image', { method: 'POST', body: form }))
}

// 코드 분석 요청: 추출된 요소 목록을 JSON으로 전송 (POST /api/developer/analyze)
// userId가 있으면 결과를 DB에 저장.
export async function analyzeElements(
  elements: ElementInput[],
  cvdType: CvdType,
  lang: Lang,
  userId?: number,
): Promise<DeveloperAnalysis> {
  return handle(await fetch('/api/developer/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cvd_type: cvdType, elements, lang, user_id: userId ?? null }),
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
// 상태는 메모리(authStore)에만 유지하고 토큰/쿠키는 쓰지 않음 (규칙 1).

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

// 로그인 (POST /api/auth/login)
export async function login(loginId: string, password: string): Promise<User> {
  return handle<User>(await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId, password }),
  }))
}

// 내 정보 조회 (GET /api/auth/me/{userId})
export async function getMe(userId: number): Promise<User> {
  return handle<User>(await fetch(`/api/auth/me/${userId}`))
}

// 내 정보 수정 (PUT /api/auth/me/{userId})
export async function updateProfile(
  userId: number,
  patch: { name?: string; email?: string },
): Promise<User> {
  return handle<User>(await fetch(`/api/auth/me/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }))
}

// 비밀번호 변경 (PUT /api/auth/me/{userId}/password)
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await handle<{ code: string; message: string }>(
    await fetch(`/api/auth/me/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }),
  )
}

// 분석 결과 히스토리 조회 (GET /api/auth/history/{userId})
export async function getHistory(userId: number): Promise<HistoryItem[]> {
  return handle<HistoryItem[]>(await fetch(`/api/auth/history/${userId}`))
}

// 히스토리 항목 삭제 (DELETE /api/auth/history/{userId}/{resultId})
export async function deleteHistoryItem(userId: number, resultId: number): Promise<void> {
  await handle<{ code: string; message: string }>(
    await fetch(`/api/auth/history/${userId}/${resultId}`, { method: 'DELETE' }),
  )
}

// 회원 탈퇴 (DELETE /api/auth/me/{userId})
export async function deleteAccount(userId: number): Promise<void> {
  await handle<{ code: string; message: string }>(
    await fetch(`/api/auth/me/${userId}`, { method: 'DELETE' }),
  )
}
