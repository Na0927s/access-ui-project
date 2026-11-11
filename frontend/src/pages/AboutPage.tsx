// (한국어 요약) 사이트 설명 페이지 — 탭으로 "우리 사이트는?" / "색각이상이 뭔가요?" 두 영역을 전환.
// 홈의 "사이트 설명" 버튼으로 들어옴. 약관(/terms)은 별도 페이지(버튼)로 이동.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CvdType } from '../api/types'
import { useT } from '../i18n/useT'

export default function AboutPage() {
  const t = useT()
  const [tab, setTab] = useState<'site' | 'cvd'>('site') // 현재 탭

  // "우리 사이트는?" 탭 항목
  const siteSections = [
    { title: t('aboutWhyTitle'), body: t('aboutWhyBody') },
    { title: t('aboutWhatTitle'), body: t('aboutWhatBody') },
    { title: t('aboutModesTitle'), body: t('aboutModesBody') },
    { title: t('aboutCriteriaTitle'), body: t('aboutCriteriaBody') },
    { title: t('aboutSeverityTitle'), body: t('aboutSeverityBody') },
    { title: t('aboutGoalTitle'), body: t('aboutGoalBody') },
  ]
  // "색각이상이 뭔가요?" 탭: 세 가지 유형 설명
  const cvdTypes: { key: CvdType; name: string; desc: string }[] = [
    { key: 'protan', name: t('protan'), desc: t('protanDesc') },
    { key: 'deutan', name: t('deutan'), desc: t('deutanDesc') },
    { key: 'tritan', name: t('tritan'), desc: t('tritanDesc') },
  ]

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 leading-relaxed">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('aboutLink')}</h1>
        {/* 약관은 별도 페이지로 */}
        <Link
          to="/terms"
          className="text-sm font-medium text-graphite underline underline-offset-4 hover:text-ink"
        >
          {t('termsLink')} →
        </Link>
      </div>

      {/* 탭: 우리 사이트는? / 색각이상이 뭔가요? */}
      <div role="tablist" aria-label={t('aboutLink')} className="flex gap-2">
        {(['site', 'cvd'] as const).map((tb) => (
          <button
            key={tb}
            role="tab"
            type="button"
            aria-selected={tab === tb}
            onClick={() => setTab(tb)}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              tab === tb
                ? 'border-2 border-ink bg-ink font-semibold text-white'
                : 'border-rule bg-white hover:bg-paper'
            }`}
          >
            {tb === 'site' ? t('aboutTabSite') : t('aboutTabCvd')}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      {tab === 'site' ? (
        <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-white p-6 text-sm shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
            {t('aboutProject')}
          </p>
          {siteSections.map((s) => (
            <div key={s.title} className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold">{s.title}</h2>
              <p className="text-graphite">{s.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-white p-6 text-sm shadow-sm md:p-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold">{t('cvdOverviewTitle')}</h2>
            <p className="text-graphite">{t('cvdOverviewBody')}</p>
          </div>
          {/* 세 가지 색각이상 유형 */}
          <div className="flex flex-col gap-3">
            {cvdTypes.map((c) => (
              <div key={c.key} className="rounded-lg bg-paper p-3">
                <p className="font-semibold">{c.name}</p>
                <p className="mt-0.5 text-graphite">{c.desc}</p>
              </div>
            ))}
          </div>
          {/* 정도 차이 / 전경도 비유 */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold">{t('cvdSeverityTitle')}</h2>
            <p className="text-graphite">{t('cvdSeverityBody')}</p>
          </div>
        </div>
      )}

      {/* 검사하러 가기 */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/user"
          className="rounded-lg border border-ink px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white"
        >
          {t('user')} {t('inspect')} →
        </Link>
        <Link
          to="/developer"
          className="rounded-lg border border-ink px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white"
        >
          {t('developer')} {t('inspect')} →
        </Link>
      </div>
    </article>
  )
}
