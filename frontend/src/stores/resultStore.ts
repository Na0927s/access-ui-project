// (한국어 요약) 분석 결과 내역 스토어 — 마이페이지 "결과 내역" 화면의 데이터.
// Memory only — no persist. Cleared on logout and lost on refresh by design.
// (한국어) 메모리에만 보관 (persist 금지 — 규칙 1번). 로그아웃하면 지워지고 새로고침하면 사라짐.
import { create } from 'zustand'
import type { CvdType, DeveloperAnalysis, ImageAnalysis } from '../api/types'

// 저장되는 분석 기록 하나: 언제, 어떤 파일을, 어떤 모드로 검사했는지 + 결과 전체
export interface AnalysisRecord {
  id: string                                  // 고유 ID (crypto.randomUUID로 생성)
  createdAt: string                           // 분석 시각 (ISO 문자열)
  fileName: string                            // 업로드한 파일명 (코드 모드는 'HTML/CSS 코드')
  mode: 'user' | 'developer-image' | 'developer-code'
  cvdType: CvdType
  score: number
  originalUrl?: string                        // 원본 이미지 미리보기 URL (선택)
  data: ImageAnalysis | DeveloperAnalysis      // 백엔드가 준 분석 결과 전체
}

interface ResultState {
  results: AnalysisRecord[]                                   // 최신 순 결과 목록
  add: (r: Omit<AnalysisRecord, 'id' | 'createdAt'>) => void  // 새 결과를 맨 앞에 추가
  remove: (id: string) => void                                // 특정 결과 삭제
  clear: () => void                                            // 전체 삭제 (로그아웃 시 호출됨)
}

export const useResultStore = create<ResultState>((set) => ({
  results: [],
  // 새 기록에 id와 생성 시각을 자동으로 부여해 목록 맨 앞(unshift)에 추가
  add: (r) =>
    set((s) => ({
      results: [{ ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.results],
    })),
  remove: (id) =>
    set((s) => ({ results: s.results.filter((r) => r.id !== id) })),
  clear: () => set({ results: [] }),
}))
