// (한국어 요약) 코드 분석 결과 표 — 요소별 결과를 판정(FAIL/WARNING/PASS)별로 묶어 표시.
// 한 묶음 안에는 같은 판정의 요소들만 모여 있고, 묶음 머리에 판정 배지와 개수가 표시됨.
// 표시 순서만 변경하고 판정값·알고리즘은 변경하지 않음.
import type { ElementResult, Verdict } from '../api/types'
import ColorChip from './ColorChip'
import VerdictBadge from './VerdictBadge'
import { useT } from '../i18n/useT'

// 묶음 표시 순서: 심각한 것부터 (FAIL → WARNING → PASS)
const GROUP_ORDER: Verdict[] = ['FAIL', 'WARNING', 'PASS']

export default function CodeResultTable({ results }: { results: ElementResult[] }) {
  const t = useT()
  // 판정별로 요소를 묶고, 빈 묶음은 제외
  const groups = GROUP_ORDER.map((v) => ({
    verdict: v,
    rows: results.filter((r) => r.verdict === v),
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.verdict} className="rounded-lg border border-rule">
          {/* 묶음 머리: 판정 배지 + 해당 판정 요소 개수 */}
          <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-paper px-3 py-2">
            <VerdictBadge verdict={g.verdict} />
            <span className="text-sm font-semibold text-graphite">
              {g.rows.length}
              {t('countUnit')}
            </span>
          </div>
          {/* 묶음 안의 요소 표 (판정 열은 묶음 머리가 대신하므로 생략) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-rule/60 text-graphite">
                  <th scope="col" className="px-3 py-2">{t('selector')}</th>
                  <th scope="col" className="px-3">{t('textColor')}</th>
                  <th scope="col" className="px-3">{t('bgColor')}</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={`${r.selector}-${i}`} className="border-b border-rule/40 last:border-0">
                    <td className="px-3 py-2">
                      <code>{r.selector}</code>
                      {r.is_large_text && (
                        <span className="ml-1 text-xs text-graphite">({t('largeText')})</span>
                      )}
                    </td>
                    <td className="px-3">
                      <ColorChip hex={r.color} />
                    </td>
                    <td className="px-3">
                      <ColorChip hex={r.background} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
