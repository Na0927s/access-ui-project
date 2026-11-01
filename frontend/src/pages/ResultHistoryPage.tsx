// (한국어 요약) 마이페이지 > 결과 내역 — 로그인 사용자의 분석 기록 목록.
// 백엔드 DB에서 히스토리를 불러오고, 항목 삭제 시 백엔드에서도 삭제.
// 날짜별 필터링, 항목 클릭 시 상세 결과 확대 표시.
import { useEffect, useMemo, useState } from 'react'
import type { DeveloperAnalysis, ImageAnalysis } from '../api/types'
import ResultSummary from '../components/ResultSummary'
import ScoreBlock from '../components/ScoreBlock'
import SessionNotice from '../components/SessionNotice'
import { useT } from '../i18n/useT'
import { removeServerResult, useResultStore } from '../stores/resultStore'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'

export default function ResultHistoryPage() {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const { results, loading, remove, loadFromServer } = useResultStore()
  const token = useAuthStore((s) => s.token)
  // 기록의 날짜(YYYY-MM-DD) 목록 — 중복 제거해 날짜 필터 옵션으로 사용
  const dates = useMemo(
    () => Array.from(new Set(results.map((r) => r.createdAt.slice(0, 10)))),
    [results],
  )
  const [date, setDate] = useState<string>('') // 선택된 필터 날짜 (빈 값 = 전체)
  const [openId, setOpenId] = useState<string | null>(null) // 현재 펼쳐 본 기록의 ID

  // 로그인 사용자면 백엔드에서 히스토리 로드
  useEffect(() => {
    if (token) loadFromServer(token)
  }, [token, loadFromServer])

  // 선택 날짜로 필터링된 목록과, 펼쳐진 기록의 원본 객체
  const list = results.filter((r) => !date || r.createdAt.startsWith(date))
  const open = results.find((r) => r.id === openId)

  // 분석 모드별 표시 라벨 (언어에 맞춰 반환)
  const modeLabel = (mode: 'user' | 'developer-image' | 'developer-code') =>
    mode === 'user'
      ? t('modeUserLabel')
      : mode === 'developer-image'
        ? t('modeDevImageLabel')
        : t('modeDevCodeLabel')

  // 날짜 포맷도 현재 언어에 맞춰 표시
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US'

  // 삭제: 메모리에서 제거 + DB 결과면 백엔드에서도 삭제
  const handleRemove = async (id: string) => {
    const rec = results.find((r) => r.id === id)
    await remove(id)
    if (rec?.dbId !== undefined && token) {
      try {
        await removeServerResult(token, rec.dbId)
      } catch {
        /* optimistic UI: 이미 화면에서 제거됨. 에러는 무시 */
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('myResults')}</h1>
      <SessionNotice />

      {loading ? (
        <p className="text-graphite">{t('historyLoading')}</p>
      ) : results.length === 0 ? (
        // 기록 없음: 안내 문구 표시
        <div
          className="min-h-48 rounded-lg border border-dashed border-graphite"
          aria-label={t('emptyResults')}
        >
          <p className="p-6 text-graphite">{t('emptyResultsMsg')}</p>
        </div>
      ) : (
        <>
          {/* 날짜 선택 드롭다운 (전체 + 기록이 있는 날짜만 옵션으로) */}
          <label className="flex items-center gap-2 text-sm font-semibold">
            {t('dateSelect')}
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-graphite bg-white px-2 py-1 font-normal"
            >
              <option value="">{t('all')}</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d.replace(/-/g, '.')}
                </option>
              ))}
            </select>
          </label>
          {/* 기록 목록: 항목 클릭 시 상세 토글, 삭제 버튼은 별도 */}
          <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-white">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                {/* 제목 행을 버튼으로 만들어 클릭/키보드로 상세 열기 가능 */}
                <button
                  type="button"
                  onClick={() => setOpenId(r.id === openId ? null : r.id)}
                  className="text-left"
                >
                  <span className="block font-semibold">{r.fileName}</span>
                  {/* 부제: 일시 · 모드 · 색약 유형 · 점수 */}
                  <span className="text-sm text-graphite">
                    {new Date(r.createdAt).toLocaleString(locale)} · {modeLabel(r.mode)} ·{' '}
                    {t(r.cvdType)} · {t('scoreShort')} {r.score}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(r.id)}
                  className="rounded border border-ink px-3 py-1 text-sm"
                >
                  {t('deleteItem')}
                </button>
              </li>
            ))}
          </ul>
          {/* 펼쳐진 기록의 상세 보기: 이미지 분석이면 전체 요약, 코드 분석이면 점수만 표시 */}
          {open &&
            ('simulated_image' in open.data ? (
              <ResultSummary
                data={open.data as ImageAnalysis}
                mode={open.mode === 'user' ? 'user' : 'developer'}
              />
            ) : (
              <div className="rounded-lg border border-rule bg-white p-5">
                <ScoreBlock
                  score={(open.data as DeveloperAnalysis).summary.score}
                  notice={(open.data as DeveloperAnalysis).score_notice}
                />
              </div>
            ))}
        </>
      )}
    </div>
  )
}
