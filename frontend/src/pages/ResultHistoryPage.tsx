// (한국어 요약) 마이페이지 > 결과 내역 — 로그인 사용자의 분석 기록 목록.
// 백엔드 DB에서 히스토리를 불러오고, 항목 삭제 시 백엔드에서도 삭제.
// 날짜별 필터링, 항목 클릭 시 상세 결과 확대 표시.
import { useEffect, useMemo, useState } from 'react'
import type { DeveloperAnalysis, ImageAnalysis } from '../api/types'
import CodeResultDetail from '../components/CodeResultDetail'
import ResultSummary from '../components/ResultSummary'
import VerdictBadge from '../components/VerdictBadge'
import { useT } from '../i18n/useT'
import { removeServerResult, useResultStore } from '../stores/resultStore'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'

export default function ResultHistoryPage() {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const { results, loading, loadError, remove, loadFromServer } = useResultStore()
  const token = useAuthStore((s) => s.token)
  // 기록의 날짜(YYYY-MM-DD) 목록 — 중복 제거해 날짜 필터 옵션으로 사용
  const dates = useMemo(
    () => Array.from(new Set(results.map((r) => r.createdAt.slice(0, 10)))),
    [results],
  )
  const [date, setDate] = useState<string>('') // 선택된 필터 날짜 (빈 값 = 전체)
  const [openId, setOpenId] = useState<string | null>(null) // 현재 펼쳐 본 기록의 ID
  const [deleteError, setDeleteError] = useState(false) // 서버 삭제 실패 표시 (D3)

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

  // 삭제: 메모리에서 제거 + DB 결과면 백엔드에서도 삭제.
  // 서버 삭제 실패 시 사용자에게 알리고 화면에 복구 (D3).
  const handleRemove = async (id: string) => {
    const rec = results.find((r) => r.id === id)
    await remove(id)
    if (rec?.dbId !== undefined && token) {
      try {
        await removeServerResult(token, rec.dbId)
      } catch {
        // 서버 삭제 실패: 에러 표시 + 목록 다시 로드해 화면 복구
        setDeleteError(true)
        await loadFromServer(token)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('myResults')}</h1>

      {loading ? (
        <p className="text-graphite">{t('historyLoading')}</p>
      ) : loadError ? (
        // 서버 로드 실패: 빈 상태와 구분해 에러 안내 (D2)
        <div className="rounded-lg border border-dashed border-graphite p-6">
          <p role="alert" className="font-medium text-red-800">
            ✕ {t('historyLoadError')}
          </p>
        </div>
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
          {/* 서버 삭제 실패 안내 (D3) — dismiss 가능 */}
          {deleteError && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              <span role="alert">✕ {t('deleteFailed')}</span>
              <button
                type="button"
                onClick={() => setDeleteError(false)}
                className="shrink-0 text-red-800 underline underline-offset-2 hover:opacity-70"
              >
                ✕
              </button>
            </div>
          )}
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
                {/* 제목 행을 버튼으로 만들어 클릭/키보드로 상세 열기 가능.
                    aria-expanded + ▲/▼ 표시자로 현재 펼침 상태를 시각·스크린리더에 전달 (C3). */}
                <button
                  type="button"
                  aria-expanded={openId === r.id}
                  onClick={() => setOpenId(r.id === openId ? null : r.id)}
                  className="flex items-start gap-2 text-left"
                >
                  <span aria-hidden className="pt-0.5 text-graphite">
                    {openId === r.id ? '▲' : '▼'}
                  </span>
                  <span>
                    <span className="block font-semibold">{r.fileName}</span>
                    {/* 부제: 일시 · 모드 · 색약 유형 · 판정 */}
                    <span className="flex flex-wrap items-center gap-1.5 text-sm text-graphite">
                      <span>
                        {new Date(r.createdAt).toLocaleString(locale)} · {modeLabel(r.mode)} ·{' '}
                        {t(r.cvdType)}
                      </span>
                      <VerdictBadge verdict={(r.data as ImageAnalysis | DeveloperAnalysis).verdict} />
                    </span>
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
          {/* 펼쳐진 기록의 상세 보기: 이미지 분석이면 전체 요약, 코드 분석이면 상세(표+해결카드) 표시 */}
          {open &&
            ('simulated_image' in open.data ? (
              <ResultSummary
                data={open.data as ImageAnalysis}
                mode={open.mode === 'user' ? 'user' : 'developer'}
                collapsible
              />
            ) : (
              <CodeResultDetail data={open.data as DeveloperAnalysis} />
            ))}
        </>
      )}
    </div>
  )
}
