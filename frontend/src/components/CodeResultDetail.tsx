// (한국어 요약) 코드 분석 결과 상세 뷰 — 결과 내역에서 코드 모드 기록 클릭 시 표시.
// DeveloperModePage의 코드 결과 영역(표 + 해결 카드)과 동일 구조를 재사용.
// 결과 내역은 메모리/DB 어디서 왔는지와 무관하게 동일하게 렌더링.
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
  const [detailOpen, setDetailOpen] = useState(false) // 요소별 결과 표 펼침 여부
  const [solutionsOpen, setSolutionsOpen] = useState(false) // 문제 해결 방법 카드 펼침 여부
  return (
    <div className="flex flex-col gap-6">
      {/* 판정 + 결과 메시지 — 항상 보임 */}
      <div className="rounded-xl border border-rule bg-white p-5 shadow-sm">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <VerdictBadge verdict={data.verdict} />
          <span>
            {t('resultLabel')}: {data.result_message}
          </span>
        </p>
      </div>

      {/* 요소별 상세 표 — 접기/펼치기. 제목을 박스 헤더에 배치. 판정별 묶음으로 표시. */}
      <section aria-labelledby="detail">
        <div className="rounded-lg border border-rule bg-white">
          <button
            type="button"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-5 py-4 text-left transition-colors hover:bg-paper"
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
            <div className="border-t border-rule p-4">
              <CodeResultTable results={data.results} />
            </div>
          )}
        </div>
      </section>

      {/* 문제 해결 방법 카드 — 접기/펼치기. 제목을 박스 헤더에 배치 (있을 때만). */}
      {boxes.length > 0 && (
        <section aria-labelledby="solutions">
          <div className="rounded-xl border border-rule bg-white shadow-sm">
            <button
              type="button"
              aria-expanded={solutionsOpen}
              onClick={() => setSolutionsOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-5 py-4 text-left transition-colors hover:bg-paper"
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
        </section>
      )}
    </div>
  )
}
