import type { Verdict } from '../api/types'

// Verdicts are never shown by color alone: icon + text + border style differ too.
const STYLE: Record<Verdict, { icon: string; cls: string }> = {
  PASS: { icon: '✓', cls: 'border-emerald-700 text-emerald-800 bg-emerald-50' },
  WARNING: { icon: '⚠', cls: 'border-amber-700 text-amber-900 bg-amber-50 border-dashed' },
  FAIL: { icon: '✕', cls: 'border-red-700 text-red-800 bg-red-50 border-2' },
}

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = STYLE[verdict]
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {verdict}
    </span>
  )
}
