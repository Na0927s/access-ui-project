// (한국어 요약) 코드 분석 결과 상세 뷰 — 결과 내역에서 코드 모드 기록 클릭 시 표시.
// 판정 · 결과 내용(표) · 문제 해결 방법 · 요약을 하나의 박스에 담아 보여준다.
// 결과 내용·문제 해결 방법은 접기/펼치기(결과 내용은 펼침, 해결 방법은 접힘 상태가 기본).
import { useState } from 'react'
import type { DeveloperAnalysis } from '../api/types'
import CodeResultTable from './CodeResultTable'
import SolutionCards from './SolutionCards'
import VerdictBadge from './VerdictBadge'
import { useT } from '../i18n/useT'

export default function CodeResultDetail({ data }: { data: DeveloperAnalysis }) {
  const t = useT()
  // solution_boxes를 SolutionCards가 기대하는 형태로 그대로 전달
  const boxes = data.solution_boxes ?? []
  // 결과 내용(표)은 펼친 상태, 문제 해결 방법은 접힌 상태가 기본.
  const [detailOpen, setDetailOpen] = useState(true)
  const [solutionsOpen, setSolutionsOpen] = useState(false)

  // 요약 렌더 헬퍼 — DeveloperModePage의 코드 모드 요약과 동일 구조.
  const renderSummary = () => {
    if (data.summary.total === 0) return <p className="text-graphite">{t('sumEmptyCode')}</p>
    if (data.summary.fail === 0 && data.summary.warning === 0)
      return <p className="text-graphite">{t('sumAllPassCode')}</p>
    return (
      <>
        <p>
          {t('sumTotal')}: {data.summary.total}개
        </p>
        <p>
          {t('sumPass')}: {data.summary.pass}개
        </p>
        <p>
          {t('sumWarn')}: {data.summary.warning}개
        </p>
        <p>
          {t('sumFail')}: {data.summary.fail}개
        </p>
        {boxes.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            {t('sumPriorityEl')}:
            <code className="rounded bg-paper px-1.5 py-0.5">{boxes[0].selector}</code>
          </p>
        )}
        <p className="text-graphite">
          {data.summary.fail === 0 ? t('sumWarnOnlyCode') : `${t('sumNext')}: ${t('sumNextStepCode')}`}
        </p>
      </>
    )
  }

  return (
    // 하나의 박스 안에 판정 · 결과 내용 · 문제 해결 방법 · 요약을 구분선으로 나누어 배치.
    <div className="overflow-hidden rounded-xl border border-rule bg-white shadow-sm">
      {/* 판정 + 결과 메시지 — 항상 보임 */}
      <div className="p-5">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <VerdictBadge verdict={data.verdict} />
          <span>
            {t('resultLabel')}: {data.result_message}
          </span>
        </p>
      </div>

      {/* 결과 내용(판정별 묶음 표) — 접기/펼치기. 기본 펼침. */}
      <div className="border-t border-rule">
        <button
          type="button"
          aria-expanded={detailOpen}
          onClick={() => setDetailOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left transition-colors hover:bg-paper"
        >
          <span className="flex items-center gap-2 text-lg font-bold">
            {t('resultContent')}
            <span className="text-sm font-medium text-graphite">
              {detailOpen ? t('btnCollapse') : t('btnExpand')}
            </span>
          </span>
          <span aria-hidden className="text-graphite">
            {detailOpen ? '▲' : '▼'}
          </span>
        </button>
        {detailOpen && (
          <div className="border-t border-rule p-5">
            <CodeResultTable results={data.results} />
          </div>
        )}
      </div>

      {/* 문제 해결 방법 카드 — 접기/펼치기. 기본 접힘. (있을 때만) */}
      {boxes.length > 0 && (
        <div className="border-t border-rule">
          <button
            type="button"
            aria-expanded={solutionsOpen}
            onClick={() => setSolutionsOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left transition-colors hover:bg-paper"
          >
            <span className="flex items-center gap-2 text-lg font-bold">
              {t('solutions')}
              <span className="text-sm font-medium text-graphite">
                {solutionsOpen ? t('btnCollapse') : t('btnExpand')}
              </span>
            </span>
            <span aria-hidden className="text-graphite">
              {solutionsOpen ? '▲' : '▼'}
            </span>
          </button>
          {solutionsOpen && (
            <div className="border-t border-rule p-5">
              <SolutionCards boxes={boxes} />
            </div>
          )}
        </div>
      )}

      {/* 요약(검사 결과 요약) — 항상 보임 */}
      <div className="border-t border-rule p-5">
        <h2 className="mb-3 text-lg font-bold">{t('summaryTitle')}</h2>
        <div className="flex flex-col gap-1.5 text-sm">{renderSummary()}</div>
      </div>
    </div>
  )
}
