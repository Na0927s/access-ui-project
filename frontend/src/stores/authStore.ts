import { create } from 'zustand'
import { useResultStore } from './resultStore'

// IMPORTANT: memory only. Do NOT add zustand `persist`, localStorage, sessionStorage or cookies.
// Accounts, login state and results disappear on refresh or logout by design.
// This is a demo-level login, not real authentication.

export interface Account {
  name: string
  email: string
  loginId: string
  passwordHash: string
}

export type PublicAccount = Omit<Account, 'passwordHash'>

export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface AuthState {
  accounts: Account[]
  currentUser: PublicAccount | null
  isIdTaken: (loginId: string) => boolean
  signup: (input: { name: string; email: string; loginId: string; password: string }) => Promise<void>
  login: (loginId: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (patch: { name?: string; email?: string }) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accounts: [],
  currentUser: null,

  isIdTaken: (loginId) => get().accounts.some((a) => a.loginId === loginId),

  signup: async ({ name, email, loginId, password }) => {
    const passwordHash = await hashPassword(password)
    set((s) => ({ accounts: [...s.accounts, { name, email, loginId, passwordHash }] }))
  },

  login: async (loginId, password) => {
    const hash = await hashPassword(password)
    const acc = get().accounts.find((a) => a.loginId === loginId && a.passwordHash === hash)
    if (!acc) return false
    set({ currentUser: { name: acc.name, email: acc.email, loginId: acc.loginId } })
    return true
  },

  logout: () => {
    set({ currentUser: null })
    useResultStore.getState().clear()
  },

  updateProfile: (patch) => {
    const user = get().currentUser
    if (!user) return
    set((s) => ({
      currentUser: { ...user, ...patch },
      accounts: s.accounts.map((a) => (a.loginId === user.loginId ? { ...a, ...patch } : a)),
    }))
  },
}))
