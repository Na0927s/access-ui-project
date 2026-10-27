// (한국어 요약) 백엔드 API 응답/요청의 TypeScript 타입 정의.
// 백엔드의 JSON 응답 구조와 필드명을 그대로 반영 — 화면 컴포넌트는 이 타입만 참조함.

export type CvdType = 'protan' | 'deutan' | 'tritan'   // 색약 유형
export type Lang = 'ko' | 'en'                        // 지원 언어
export type Verdict = 'PASS' | 'WARNING' | 'FAIL'    // 판정 3단계
export type Grade = 'STRONG' | 'RECOMMENDED' | 'CONDITIONAL' // 추천 색상 등급

// --- 회원 관리 (auth) 타입 ---

// 백엔드가 반환하는 사용자 정보 (비밀번호 제외)
export interface User {
  id: number
  name: string
  email: string
  login_id: string
}

// 분석 결과 히스토리 한 건 (백엔드 AnalysisResult → API 응답)
export interface HistoryItem {
  id: number
  user_id: number
  mode: string                 // "user" | "developer"
  cvd_type: CvdType
  input_meta: string | null    // 파일명 또는 "HTML/CSS 코드"
  score: number | null
  verdict: Verdict
  created_at: string           // ISO 문자열
  data: Record<string, unknown> // 분석 결과 전체 (시뮬레이션 이미지는 제거됨)
}

// 팔레트에서 추출된 주요 색상 하나 (hex 코드 + 화면 차지 비율)
export interface PaletteColor { hex: string; ratio: number }

// 대비 검사 결과 한 쌍 (전경/배경): 세 가지 기준별 판정 포함
export interface ContrastPair {
  fg: string; bg: string; ratio: number
  normal_text: 'PASS' | 'FAIL'; large_text: 'PASS' | 'FAIL'; ui_component: 'PASS' | 'FAIL'
  verdict: Verdict
}

// 색상 혼동 검사 결과 한 쌍: 원본/시뮬레이션 후의 색 거리(ΔE) 비교
export interface ConfusablePair {
  a: string; b: string; distance_original: number; distance_simulated: number; verdict: Verdict
}

// 발견된 문제 하나 (저대비 또는 색상 혼동)
export interface Issue {
  id: number; type: 'LOW_CONTRAST' | 'COLOR_CONFUSION'; severity: 'LOW' | 'MEDIUM' | 'HIGH'
  colors: string[]; message: string
}

// 재검증을 통과한 추천 색상 후보 하나
export interface Candidate { hex: string; ratio: number; grade: Grade; reason: string }

// 문제 색상에 대한 추천 결과: 후보 목록 + 색 이외의 개선 팁
export interface Recommendation {
  current: string; against: string; candidates: Candidate[]; non_color_tips: string[]
}

// 이미지 분석 전체 응답 (사용자 모드와 개발자 모드 공용)
export interface ImageAnalysis {
  cvd_type: CvdType; width: number; height: number
  simulated_image: string           // base64 data URL 형태의 시뮬레이션 결과 이미지
  palette: PaletteColor[]           // 주요 색상 목록
  contrast_pairs: ContrastPair[]     // 대비 검사 결과
  confusable_pairs: ConfusablePair[] // 색상 혼동 검사 결과
  issues: Issue[]                    // 발견된 문제 목록
  verdict: Verdict
  result_message: string
  /** Developer mode only — user mode provides no fixes per the design doc.
   *  (한국어) 개발자 모드에서만 포함됨 (설계 문서상 사용자 모드는 해결책 제공 안 함) */
  recommendations?: Recommendation[]
  score: number
  score_notice: string               // "자체 지표" 고지 문구
}

// 코드 분석 요청 시 보낼 요소 하나 (selector + 색 + 폰트 정보)
export interface ElementInput {
  selector: string; text: string; color: string; background: string
  font_size_px: number | null; font_weight: number | null
}

// 코드 분석의 요소별 결과 (테이블 한 행에 해당)
export interface ElementResult {
  selector: string; color: string; background: string; ratio: number; is_large_text: boolean
  normal_text: 'PASS' | 'FAIL'; large_text: 'PASS' | 'FAIL'; verdict: Verdict; distance_simulated: number
}

// 문제 해결 방법 카드 하나 (CONTRAST=대비, LIGHTNESS=명암, COLOR_ONLY=색 의존)
export interface SolutionBox {
  selector: string; check_type: 'CONTRAST' | 'LIGHTNESS' | 'COLOR_ONLY'
  problem: string; css_fix: string | null; non_color_fix: string | null
}

// 코드 분석 전체 응답
export interface DeveloperAnalysis {
  results: ElementResult[]        // 요소별 상세 결과
  solution_boxes: SolutionBox[]  // 해결 방법 카드 목록
  verdict: Verdict
  result_message: string
  summary: { total: number; pass: number; warning: number; fail: number; score: number }
  score_notice: string
}
