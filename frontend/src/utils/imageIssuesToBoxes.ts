// (한국어 요약) 이미지 분석 결과를 문제 해결 카드(SolutionBox) 형태로 변환하는 어댑터.
// 이슈 목록과 추천 색상 목록은 같은 순서로 생성되었으므로 인덱스(i)로 서로 짝지을 수 있음.
// DeveloperModePage(검사 화면)와 ResultHistoryPage(결과 내역) 양쪽에서 재사용.
import type { ImageAnalysis, SolutionBox } from '../api/types'

export function imageIssuesToBoxes(data: ImageAnalysis): SolutionBox[] {
  return data.issues.map((issue, i) => {
    const rec = data.recommendations?.[i]
    // 조건부(CONDITIONAL) 등급은 되도록 피하고, 없으면 첫 후보 사용
    const fix = rec
      ? (rec.candidates.find((c) => c.grade !== 'CONDITIONAL') ?? rec.candidates[0])
      : undefined
    return {
      selector: issue.colors.join(' / '), // 이미지 모드는 선택자가 없으므로 색상 쌍으로 표시
      check_type: issue.type === 'LOW_CONTRAST' ? 'CONTRAST' : 'COLOR_ONLY',
      problem: issue.message,
      css_fix: rec && fix ? `/* ${rec.current} → */ color: ${fix.hex};` : null,
      non_color_fix: rec ? rec.non_color_tips[0] : null,
    }
  })
}
