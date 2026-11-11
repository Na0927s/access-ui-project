// (한국어 요약) 메인(홈) 페이지 — 사이트 간단 설명(접기/펼침), 모드 선택 카드, 핵심 검사 키워드.
// 무채색 UI 컨셉 유지(규칙 8) — 화면에서 색을 가진 요소는 오직 분석 대상 이미지뿐.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'

export default function MainPage() {
  const t = useT()
  const [introOpen, setIntroOpen] = useState(true) // 사이트 간단 설명 펼침 여부(기본 펼침)
  // 두 개의 모드 선택 카드 데이터 (아이콘은 장식)
  const cards = [
    { to: '/user', title: t('user'), desc: t('userDesc'), icon: '▣' },
    { to: '/developer', title: t('developer'), desc: t('developerDesc'), icon: '</>' },
  ]
  // 핵심 검사 키워드 3가지 — 홈 하단에 한눈에 보여주는 카드
  const features = [
    { icon: '◐', title: t('homeFeature1'), desc: t('homeFeature1Desc') },
    { icon: '◇', title: t('homeFeature2'), desc: t('homeFeature2Desc') },
    { icon: '◈', title: t('homeFeature3'), desc: t('homeFeature3Desc') },
  ]

  return (
    <div className="flex flex-col gap-12">
      {/* 상단 히어로 + 사이트 간단 설명(접기/펼침) */}
      <section className="flex flex-col gap-4">
        <span className="w-fit rounded-full border border-rule bg-white px-3 py-1 text-xs font-semibold text-graphite">
          CVDS
        </span>
        <h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-5xl">{t('tagline')}</h1>
        <p className="max-w-2xl text-base text-graphite md:text-lg">{t('lead')}</p>
        {/* 사이트 간단 설명 — 접고 싶은 사람은 접을 수 있음 */}
        <div className="max-w-2xl">
          {introOpen && (
            <p className="rounded-xl border border-rule bg-white p-4 text-sm leading-relaxed text-graphite shadow-sm">
              {t('homeIntro')}
            </p>
          )}
          <button
            type="button"
            aria-expanded={introOpen}
            onClick={() => setIntroOpen((v) => !v)}
            className="mt-2 text-xs font-medium text-graphite underline underline-offset-4 hover:text-ink"
          >
            {introOpen ? `▲ ${t('homeIntroToggle')}` : `▼ ${t('homeIntro')}`}
          </button>
        </div>
      </section>

      {/* 모드 선택 카드: 사용자(좌) / 개발자(우) — hover 시 배경 반전 */}
      <section aria-label="modes" className="grid gap-6 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex min-h-56 flex-col justify-between rounded-2xl border border-ink bg-white p-7 transition-all hover:-translate-y-0.5 hover:bg-ink hover:text-white hover:shadow-lg"
          >
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-xl border border-rule text-xl font-mono group-hover:border-white/40"
            >
              {c.icon}
            </span>
            <span className="mt-6">
              <span className="block text-2xl font-bold">{c.title}</span>
              <span className="mt-1.5 block text-graphite group-hover:text-white/80">{c.desc}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                {t('inspect')} <span aria-hidden>→</span>
              </span>
            </span>
          </Link>
        ))}
      </section>

      {/* 핵심 검사 키워드 3가지 — 아이콘 + 제목 + 설명 (하단) */}
      <section aria-label="features" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-graphite">{t('homeFeaturesTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-2 rounded-xl border border-rule bg-white p-5 shadow-sm"
            >
              <span aria-hidden className="text-2xl">
                {f.icon}
              </span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-graphite">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
