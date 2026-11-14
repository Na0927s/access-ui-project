// (한국어 요약) 코드 분석 결과 상세 뷰 — 결과 내역에서 코드 모드 기록 클릭 시 표시.
// DeveloperModePage의 코드 결과 영역(표 + 해결 카드)과 동일 구조를 재사용.
// 결과 내역은 메모리/DB 어디서 왔는지와 무관하게 동일하게 렌더링.
import type { DeveloperAnalysis } from '../api/types'
import ColorChip from './ColorChip'
import SolutionCards from './SolutionCards'
import VerdictBadge from './VerdictBadge'
import { useT } from '../i18n/useT'

export default function CodeResultDetail({ data }: { data: DeveloperAnalysis }) {
  const t = useT()
  // solution_boxes를 SolutionCards가 기대하는 형태로 그대로 전달
  const boxes = data.solution_boxes ?? []
  return (
    <div className="flex flex-col gap-6">
      {/* 판정 + 결과 메시지 */}
      <div className="rounded-xl border border-rule bg-white p-5 shadow-sm">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <VerdictBadge verdict={data.verdict} />
          <span>
            {t('resultLabel')}: {data.result_message}
          </span>
        </p>
      </div>

      {/* 요소별 상세 표 (선택자/글자색/배경색/판정) */}
      <section className="rounded-lg border border-rule bg-white p-5">
        <h2 className="mb-3 text-lg font-bold">{t('resultContent')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-rule">
                <th className="py-2">{t('selector')}</th>
                <th>{t('textColor')}</th>
                <th>{t('bgColor')}</th>
                <th>{t('verdictCol')}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r, i) => (
                <tr key={`${r.selector}-${i}`} className="border-b border-rule/60">
                  <td className="py-2">
                    <code>{r.selector}</code>
                    {r.is_large_text && (
                      <span className="ml-1 text-xs text-graphite">({t('largeText')})</span>
                    )}
                  </td>
                  <td>
                    <ColorChip hex={r.color} />
                  </td>
                  <td>
                    <ColorChip hex={r.background} />
                  </td>
                  <td>
                    <VerdictBadge verdict={r.verdict} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 문제 해결 방법 카드 (있을 때만) */}
      {boxes.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">{t('solutions')}</h2>
          <SolutionCards boxes={boxes} />
        </section>
      )}
    </div>
  )
}
