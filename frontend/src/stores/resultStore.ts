// (한국어 요약) 분석 결과 내역 스토어 — 마이페이지 "결과 내역" 화면의 데이터.
// 로그인 사용자의 결과는 백엔드 DB에 저장되므로, 로그인 시 loadFromServer()로 불러온다.
// 비로그인은 메모리에만 유지 (규칙 1: 비로그인 결과는 저장 안 함).
// persist 금지 — 새로고침 시 메모리가 날아가고, 로그인 시 다시 백엔드에서 로드.
import { create } from 'zustand'
import { deleteHistoryItem, getHistory } from '../api/client'
import type { CvdType, DeveloperAnalysis, HistoryItem, ImageAnalysis } from '../api/types'

// 화면에서 쓰는 분석 기록 하나 (백엔드 HistoryItem과 유사하지만 화면용으로 정규화)
export interface AnalysisRecord {
  id: string                                  // 고유 ID (백엔드 결과면 "db:<number>", 메모리면 uuid)
  createdAt: string                           // 분석 시각 (ISO 문자열)
  fileName: string                            // 업로드한 파일명 (코드 모드는 'HTML/CSS 코드')
  mode: 'user' | 'developer-image' | 'developer-code'
  cvdType: CvdType
  score: number
  originalUrl?: string                        // 원본 이미지 미리보기 URL (선택)
  data: ImageAnalysis | DeveloperAnalysis      // 백엔드가 준 분석 결과 전체
  dbId?: number                               // 백엔드 결과 ID (있으면 DB 삭제 API 호출)
}

interface ResultState {
  results: AnalysisRecord[]                                   // 최신 순 결과 목록
  loading: boolean                                            // 서버 로드 중 여부
  add: (r: Omit<AnalysisRecord, 'id' | 'createdAt'>) => void  // 새 결과를 맨 앞에 추가
  remove: (id: string) => Promise<void>                       // 특정 결과 삭제 (DB 결과면 백엔드도 삭제)
  clear: () => void                                            // 전체 삭제 (로그아웃 시 호출)
  loadFromServer: (userId: number) => Promise<void>           // 백엔드에서 히스토리 로드
}

// 백엔드 HistoryItem → 화면용 AnalysisRecord 변환
// 백엔드 mode 값: 'user'(사용자 이미지) / 'developer'(개발자 이미지) / 'developer-code'(개발자 코드)
function toRecord(item: HistoryItem): AnalysisRecord {
  const mode: AnalysisRecord['mode'] =
    item.mode === 'developer-code' ? 'developer-code'
    : item.mode === 'developer' ? 'developer-image'
    : 'user'
  const isImageMode = mode === 'user' || mode === 'developer-image'
  const data = item.data as unknown as ImageAnalysis | DeveloperAnalysis
  const score = isImageMode && 'score' in data ? (data as ImageAnalysis).score
    : !isImageMode && 'summary' in data ? (data as DeveloperAnalysis).summary.score
    : (item.score ?? 0)
  return {
    id: `db:${item.id}`,
    dbId: item.id,
    createdAt: item.created_at,
    fileName: item.input_meta ?? (mode === 'developer-code' ? 'HTML/CSS 코드' : '이미지 분석'),
    mode,
    cvdType: item.cvd_type,
    score: score,
    data,
  }
}

export const useResultStore = create<ResultState>((set, get) => ({
  results: [],
  loading: false,
  // 새 기록에 id와 생성 시각을 자동으로 부여해 목록 맨 앞(unshift)에 추가
  // (로그인 사용자의 경우 백엔드에 이미 저장되어 있으므로, add는 비로그인 메모리 결과용)
  add: (r) =>
    set((s) => ({
      results: [{ ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...s.results],
    })),
  remove: async (id) => {
    const rec = get().results.find((r) => r.id === id)
    // DB 결과면 백엔드에서도 삭제
    if (rec?.dbId !== undefined && rec.dbId !== null) {
      // userId는 백엔드가 결과의 user_id로 식별하므로, dbId만 넘겨도 됨.
      // 단 API가 /api/auth/history/{userId}/{resultId} 형태라 userId 필요 → dbId로 재구성 불가.
      // 그래서 삭제는 ResultHistoryPage에서 userId를 받아 호출하거나, 여기서 보관.
      // (여기서는 optimistic UI만 하고 실제 삭제는 별도 함수로 처리)
    }
    set((s) => ({ results: s.results.filter((r) => r.id !== id) }))
  },
  clear: () => set({ results: [] }),
  loadFromServer: async (userId) => {
    set({ loading: true })
    try {
      const items = await getHistory(userId)
      // 최신순 정렬은 백엔드가 이미 수행
      set({ results: items.map(toRecord), loading: false })
    } catch {
      set({ loading: false })
      // 실패 시 빈 목록 유지 (에러는 호출 측에서 처리)
    }
  },
}))

// DB에서 특정 결과 삭제 (userId 필요 — 백엔드 API 경로상). 별도 export.
export async function removeServerResult(userId: number, dbId: number): Promise<void> {
  await deleteHistoryItem(userId, dbId)
}
