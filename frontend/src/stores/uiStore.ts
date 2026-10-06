// (한국어 요약) UI 전역 상태 스토어 — 현재 언어(ko/en) 관리
import { create } from 'zustand'

export type Lang = 'ko' | 'en'

interface UiState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useUiStore = create<UiState>((set) => ({
  lang: 'ko', // 기본 언어는 한국어
  setLang: (lang) => {
    // <html lang="..."> 속성도 함께 바꿔 스크린리더가 올바른 언어로 읽게 함 (접근성)
    document.documentElement.lang = lang
    set({ lang })
  },
}))
