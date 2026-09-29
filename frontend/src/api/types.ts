export type CvdType = 'protan' | 'deutan' | 'tritan'
export type Lang = 'ko' | 'en'
export type Verdict = 'PASS' | 'WARNING' | 'FAIL'
export type Grade = 'STRONG' | 'RECOMMENDED' | 'CONDITIONAL'

export interface PaletteColor { hex: string; ratio: number }

export interface ContrastPair {
  fg: string; bg: string; ratio: number
  normal_text: 'PASS' | 'FAIL'; large_text: 'PASS' | 'FAIL'; ui_component: 'PASS' | 'FAIL'
  verdict: Verdict
}

export interface ConfusablePair {
  a: string; b: string; distance_original: number; distance_simulated: number; verdict: Verdict
}

export interface Issue {
  id: number; type: 'LOW_CONTRAST' | 'COLOR_CONFUSION'; severity: 'LOW' | 'MEDIUM' | 'HIGH'
  colors: string[]; message: string
}

export interface Candidate { hex: string; ratio: number; grade: Grade; reason: string }

export interface Recommendation {
  current: string; against: string; candidates: Candidate[]; non_color_tips: string[]
}

export interface ImageAnalysis {
  cvd_type: CvdType; width: number; height: number
  simulated_image: string
  palette: PaletteColor[]
  contrast_pairs: ContrastPair[]
  confusable_pairs: ConfusablePair[]
  issues: Issue[]
  verdict: Verdict
  result_message: string
  /** Developer mode only — user mode provides no fixes per the design doc. */
  recommendations?: Recommendation[]
  score: number
  score_notice: string
}

export interface ElementInput {
  selector: string; text: string; color: string; background: string
  font_size_px: number | null; font_weight: number | null
}

export interface ElementResult {
  selector: string; color: string; background: string; ratio: number; is_large_text: boolean
  normal_text: 'PASS' | 'FAIL'; large_text: 'PASS' | 'FAIL'; verdict: Verdict; distance_simulated: number
}

export interface SolutionBox {
  selector: string; check_type: 'CONTRAST' | 'LIGHTNESS' | 'COLOR_ONLY'
  problem: string; css_fix: string | null; non_color_fix: string | null
}

export interface DeveloperAnalysis {
  results: ElementResult[]
  solution_boxes: SolutionBox[]
  verdict: Verdict
  result_message: string
  summary: { total: number; pass: number; warning: number; fail: number; score: number }
  score_notice: string
}
