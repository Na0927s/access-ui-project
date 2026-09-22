import { create } from 'zustand'

export type Lang = 'ko' | 'en'

interface UiState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useUiStore = create<UiState>((set) => ({
  lang: 'ko',
  setLang: (lang) => {
    document.documentElement.lang = lang
    set({ lang })
  },
}))
