// (한국어 요약) 로그인 상태 관리 스토어 (Zustand).
// 회원가입/로그인/로그아웃/내 정보 수정을 모두 "브라우저 메모리"에서만 처리하는
// 데모 수준의 인증 — 백엔드 회원 API는 존재하지 않음 (프로젝트 규칙 1, 2번)
import { create } from 'zustand'
import { useResultStore } from './resultStore'

// IMPORTANT: memory only. Do NOT add zustand `persist`, localStorage, sessionStorage or cookies.
// Accounts, login state and results disappear on refresh or logout by design.
// This is a demo-level login, not real authentication.
// (한국어) 절대 persist·localStorage 등을 추가하지 말 것 — 새로고침/로그아웃 시 사라지는 것이 의도.

// 메모리에 저장되는 계정 정보 (비밀번호는 평문 대신 해시로 보관)
export interface Account {
  name: string
  email: string
  loginId: string
  passwordHash: string
}

// 화면에 보여줄 때 비밀번호 해시를 제외한 계정 정보
export type PublicAccount = Omit<Account, 'passwordHash'>

// 비밀번호를 SHA-256 해시로 변환 (Web Crypto API 사용 — 평문 저장 방지용)
export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface AuthState {
  accounts: Account[]                                        // 이 세션에서 가입한 계정 목록 (메모리)
  currentUser: PublicAccount | null                          // 현재 로그인한 사용자 (null이면 비로그인)
  isIdTaken: (loginId: string) => boolean                    // ID 중복 검사 (회원가입 화면용)
  signup: (input: { name: string; email: string; loginId: string; password: string }) => Promise<void>
  login: (loginId: string, password: string) => Promise<boolean> // 성공 true / 실패 false
  logout: () => void
  updateProfile: (patch: { name?: string; email?: string }) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accounts: [],
  currentUser: null,

  // 이미 같은 ID로 가입한 계정이 있는지 확인
  isIdTaken: (loginId) => get().accounts.some((a) => a.loginId === loginId),

  // 회원가입: 비밀번호를 해시로 만들어 메모리 계정 목록에 추가
  signup: async ({ name, email, loginId, password }) => {
    const passwordHash = await hashPassword(password)
    set((s) => ({ accounts: [...s.accounts, { name, email, loginId, passwordHash }] }))
  },

  // 로그인: ID와 비밀번호 해시가 모두 일치하는 계정을 찾으면 currentUser 설정
  login: async (loginId, password) => {
    const hash = await hashPassword(password)
    const acc = get().accounts.find((a) => a.loginId === loginId && a.passwordHash === hash)
    if (!acc) return false
    set({ currentUser: { name: acc.name, email: acc.email, loginId: acc.loginId } })
    return true
  },

  // 로그아웃: 로그인 상태 초기화 + 분석 결과 내역도 함께 삭제 (규칙 1번)
  logout: () => {
    set({ currentUser: null })
    useResultStore.getState().clear()
  },

  // 내 정보 수정: 로그인 사용자 정보와 계정 목록 양쪽에 반영
  updateProfile: (patch) => {
    const user = get().currentUser
    if (!user) return
    set((s) => ({
      currentUser: { ...user, ...patch },
      accounts: s.accounts.map((a) => (a.loginId === user.loginId ? { ...a, ...patch } : a)),
    }))
  },
}))
