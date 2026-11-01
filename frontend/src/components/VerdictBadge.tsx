// (한국어 요약) 판정(PASS/WARNING/FAIL) 표시 배지.
// Verdicts are never shown by color alone: icon + text + border style differ too.
// (한국어) 규칙 8번: 색으로만 구분하지 않고 아이콘(✓/⚠/✕) + 텍스트 + 테두리 스타일을 모두 다르게 표시
import type { Verdict } from '../api/types'

// 판정별 표시 스타일: 아이콘 + 테두리 색/굵기/모양이 각각 다름
const STYLE: Record<Verdict, { icon: string; cls: string }> = {
  PASS: { icon: '✓', cls: 'border-emerald-700 text-emerald-800 bg-emerald-50' }, // 실선 테두리
  WARNING: { icon: '⚠', cls: 'border-amber-700 text-amber-900 bg-amber-50 border-dashed' }, // 점선 테두리
  FAIL: { icon: '✕', cls: 'border-red-700 text-red-800 bg-red-50 border-2' }, // 굵은 테두리
}

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = STYLE[verdict]
  return (
    // 아이콘은 aria-hidden으로 장식 처리 — 판정 텍스트(PASS 등)만 스크린리더가 읽음
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${s.cls}`}
    >
      <span aria-hidden>{s.icon}</span>
      {verdict}
    </span>
  )
}
