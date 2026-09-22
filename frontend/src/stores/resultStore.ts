import { create } from 'zustand'
import type { CvdType, DeveloperAnalysis, ImageAnalysis } from '../api/types'

// Memory only — no persist. Cleared on logout and lost on refresh by design.

export interface AnalysisRecord {
  id: string
  createdAt: string
  fileName: string
  mode: 'user' | 'developer-image' | 'developer-code'
  cvdType: CvdType
  score: number
  originalUrl?: string
  data: ImageAnalysis | DeveloperAnalysis
}

interface ResultState {
  results: AnalysisRecord[]
  add: (r: Omit<AnalysisRecord, 'id' | 'createdAt'>) => void
  remove: (id: string) => void
  clear: () => void
}

export const useResultStore = create<ResultState>((set) => ({
  results: [],
  add: (r) =>
    set((s) => ({
      results: [{ ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.results],
    })),
  remove: (id) =>
    set((s) => ({ results: s.results.filter((r) => r.id !== id) })),
  clear: () => set({ results: [] }),
}))
