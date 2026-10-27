// (한국어 요약) 로그인 상태 관리 스토어 (Zustand).
// 백엔드 DB(SQLite + bcrypt) 기반 회원 관리 API와 통신 — 회원가입/로그인/내정보/탈퇴를
// 백엔드에 위임한다. 규칙 1·2: 인증 토큰은 쓰지 않고 메모리에 currentUser만 보관.
// 새로고침하면 메모리가 날아가 로그아웃 상태가 됨 (의도적 — persist 금지).
import { create } from 'zustand'
import * as api from '../api/client'
import type { User } from '../api/types'
import { useResultStore } from './resultStore'

// IMPORTANT: memory only. Do NOT add zustand `persist`, localStorage, sessionStorage or cookies.
// currentUser lives in memory only; on refresh the user is logged out by design.
// (한국어) 절대 persist·localStorage 등을 추가하지 말 것 — 새로고침 시 로그아웃이 의도.
// 비밀번호는 백엔드가 bcrypt로 해시해 저장하므로 프론트에서 다루지 않음.

// 화면에 보여줄 때 비밀번호를 제외한 사용자 정보 (백엔드 User 타입과 동일)
export type CurrentUser = {
  id: number
  name: string
  email: string
  loginId: string
}

interface AuthState {
  currentUser: CurrentUser | null                          // 현재 로그인한 사용자 (null이면 비로그인)
  loading: boolean                                          // API 호출 중 여부 (화면 스피너용)
  error: string | null                                      // 최근 에러 메시지 (화면 표시용)
  signup: (input: { name: string; email: string; loginId: string; password: string }) => Promise<boolean>
  login: (loginId: string, password: string) => Promise<boolean>  // 성공 true / 실패 false
  logout: () => void
  updateProfile: (patch: { name?: string; email?: string }) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  deleteAccount: () => Promise<boolean>                    // 회원 탈퇴 후 로그아웃
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  loading: false,
  error: null,

  // 회원가입: 백엔드에 계정 생성 요청. 성공 시 자동 로그인.
  signup: async ({ name, email, loginId, password }) => {
    set({ loading: true, error: null })
    try {
      const user = await api.signup({ name, email, loginId, password })
      set({ currentUser: toCurrentUser(user), loading: false })
      return true
    } catch (e) {
      set({ loading: false, error: msg(e) })
      return false
    }
  },

  // 로그인: 백엔드에서 비밀번호 검증 후 사용자 정보 수신.
  login: async (loginId, password) => {
    set({ loading: true, error: null })
    try {
      const user = await api.login(loginId, password)
      set({ currentUser: toCurrentUser(user), loading: false })
      return true
    } catch (e) {
      set({ loading: false, error: msg(e) })
      return false
    }
  },

  // 로그아웃: 메모리 사용자 초기화 + 분석 결과 내역도 삭제 (규칙 1).
  // 백엔드 세션은 존재하지 않으므로(토큰 없음) 프론트 메모리만 비우면 됨.
  logout: () => {
    set({ currentUser: null, error: null })
    useResultStore.getState().clear()
  },

  // 내 정보 수정: 백엔드에 변경 요청 후 메모리 사용자 정보도 갱신.
  updateProfile: async (patch) => {
    const user = get().currentUser
    if (!user) return false
    set({ loading: true, error: null })
    try {
      const updated = await api.updateProfile(user.id, patch)
      set({ currentUser: toCurrentUser(updated), loading: false })
      return true
    } catch (e) {
      set({ loading: false, error: msg(e) })
      return false
    }
  },

  // 비밀번호 변경: 현재 비밀번호 검증 후 새 비밀번호로 교체.
  changePassword: async (currentPassword, newPassword) => {
    const user = get().currentUser
    if (!user) return false
    set({ loading: true, error: null })
    try {
      await api.changePassword(user.id, currentPassword, newPassword)
      set({ loading: false })
      return true
    } catch (e) {
      set({ loading: false, error: msg(e) })
      return false
    }
  },

  // 회원 탈퇴: 백엔드에서 계정+결과 삭제 후 로그아웃.
  deleteAccount: async () => {
    const user = get().currentUser
    if (!user) return false
    set({ loading: true, error: null })
    try {
      await api.deleteAccount(user.id)
      set({ currentUser: null, loading: false, error: null })
      useResultStore.getState().clear()
      return true
    } catch (e) {
      set({ loading: false, error: msg(e) })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))

// 백엔드 User(snake_case) → 프론트 CurrentUser(camelCase) 변환
function toCurrentUser(u: User): CurrentUser {
  return { id: u.id, name: u.name, email: u.email, loginId: u.login_id }
}

// 에러 객체에서 사용자에게 보여줄 메시지 추출
function msg(e: unknown): string {
  if (e instanceof Error) return e.message
  return '요청을 처리하지 못했습니다.'
}
