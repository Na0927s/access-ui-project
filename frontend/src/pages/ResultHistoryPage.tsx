import { useMemo, useState } from 'react'
import type { DeveloperAnalysis, ImageAnalysis } from '../api/types'
import ResultSummary from '../components/ResultSummary'
import ScoreBlock from '../components/ScoreBlock'
import SessionNotice from '../components/SessionNotice'
import { useT } from '../i18n/useT'
import { useResultStore } from '../stores/resultStore'

const MODE_LABEL = { user: '사용자 모드', 'developer-image': '개발자 · 이미지', 'developer-code': '개발자 · 코드' }

export default function ResultHistoryPage() {
  const t = useT()
  const { results, remove } = useResultStore()
  const dates = useMemo(() => Array.from(new Set(results.map((r) => r.createdAt.slice(0, 10)))), [results])
  const [date, setDate] = useState<string>('')
  const [openId, setOpenId] = useState<string | null>(null)

  const list = results.filter((r) => !date || r.createdAt.startsWith(date))
  const open = results.find((r) => r.id === openId)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('myResults')}</h1>
      <SessionNotice />

      {results.length === 0 ? (
        <div className="min-h-48 rounded-lg border border-dashed border-graphite" aria-label="결과 없음">
          <p className="p-6 text-graphite">아직 분석한 결과가 없습니다. 사용자 모드나 개발자 모드에서 검사를 해보세요.</p>
        </div>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm font-semibold">
            날짜 선택
            <select value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-graphite bg-white px-2 py-1 font-normal">
              <option value="">전체</option>
              {dates.map((d) => <option key={d} value={d}>{d.replace(/-/g, '.')}</option>)}
            </select>
          </label>
          <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-white">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button type="button" onClick={() => setOpenId(r.id === openId ? null : r.id)} className="text-left">
                  <span className="block font-semibold">{r.fileName}</span>
                  <span className="text-sm text-graphite">
                    {new Date(r.createdAt).toLocaleString('ko-KR')} · {MODE_LABEL[r.mode]} · {t(r.cvdType)} · 점수 {r.score}
                  </span>
                </button>
                <button type="button" onClick={() => remove(r.id)} className="rounded border border-ink px-3 py-1 text-sm">삭제</button>
              </li>
            ))}
          </ul>
          {open && (
            'simulated_image' in open.data ? (
              <ResultSummary data={open.data as ImageAnalysis} mode={open.mode === 'user' ? 'user' : 'developer'} />
            ) : (
              <div className="rounded-lg border border-rule bg-white p-5">
                <ScoreBlock score={(open.data as DeveloperAnalysis).summary.score} notice={(open.data as DeveloperAnalysis).score_notice} />
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
