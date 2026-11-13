// (한국어 요약) 메인(홈) 페이지 — 기업 사이트(대한항공 류) 톤.
// 선명한 가로선 + 정돈된 그리드 + 기업적 타이포그래피. 장식 없이 구조로 승부.
// 무채색 UI 컨셉 유지(규칙 8) — 화면에서 색을 가진 요소는 오직 분석 대상 이미지뿐.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'

export default function MainPage() {
  const t = useT()
  const [introOpen, setIntroOpen] = useState(false) // 사이트 간단 설명 펼침 여부(기본 접힘)

  // 두 개의 모드 선택 카드 데이터
  const cards = [
    { to: '/user', title: t('user'), desc: t('userDesc'), no: '01' },
    { to: '/developer', title: t('developer'), desc: t('developerDesc'), no: '02' },
  ]
  // 핵심 검사 키워드 3가지
  const features = [
    { title: t('homeFeature1'), desc: t('homeFeature1Desc') },
    { title: t('homeFeature2'), desc: t('homeFeature2Desc') },
    { title: t('homeFeature3'), desc: t('homeFeature3Desc') },
  ]

  return (
    <div className="flex flex-col">
      {/* --- 히어로: 상단 라벨 + 큰 제목 --- */}
      <section className="flex flex-col gap-4 border-b border-rule-strong py-8 md:py-12">
        <span className="font-mono text-xs font-bold tracking-widest text-ink uppercase">
          Color Vision Deficiency Simulator
        </span>

        <h1 className="text-3xl font-bold leading-snug tracking-tight md:text-5xl">
          {t('tagline')}
        </h1>
        <p className="max-w-2xl text-base text-graphite md:text-lg">{t('lead')}</p>

        {/* 사이트 간단 설명 — 기본 접힘 */}
        <div className="mt-2">
          <button
            type="button"
            aria-expanded={introOpen}
            onClick={() => setIntroOpen((v) => !v)}
            className="text-sm font-semibold text-ink underline underline-offset-4 hover:text-graphite"
          >
            {introOpen ? `${t('homeIntroToggle')} −` : `+ ${t('homeIntroToggle')}`}
          </button>
          {introOpen && (
            <p className="mt-3 max-w-2xl border-l-2 border-rule-strong pl-4 text-sm leading-relaxed text-graphite md:text-base">
              {t('homeIntro')}
            </p>
          )}
        </div>
      </section>

      {/* --- 모드 선택: 2컬럼 그리드. 입체감 그림자 + 호버 시 조명 효과 + 검정 반전 --- */}
      <section aria-label="modes" className="grid gap-5 py-8 md:grid-cols-2 md:py-10">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative flex items-start gap-5 overflow-hidden rounded-2xl border border-rule bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ink hover:bg-ink hover:text-white hover:shadow-lift md:p-8 [box-shadow:var(--shadow-card),var(--shadow-inset-line)]"
          >
            {/* 호버 시 조명(스포트라이트) 효과 — 좌상에서 흰 빛이 퍼짐 (블랙/화이트 투명도만) */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: 'var(--light-spotlight-dark)' }}
            />
            <span className="relative font-mono text-3xl font-bold text-graphite transition-colors group-hover:text-white/40 md:text-4xl">
              {c.no}
            </span>
            <span className="relative flex flex-col gap-2">
              <span className="text-xl font-bold tracking-tight md:text-2xl">{c.title}</span>
              <span className="text-sm text-graphite transition-colors group-hover:text-white/70">{c.desc}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold">
                {t('inspect')}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </span>
          </Link>
        ))}
      </section>

      {/* --- 핵심 검사 3가지: 섹션 헤더 + 3컬럼 그리드. 입체감 + 호버 조명 --- */}
      <section aria-label="features" className="flex flex-col gap-5 pb-10 md:pb-12">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs font-bold tracking-widest text-ink uppercase">
            {t('homeFeaturesTitle')}
          </span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-rule bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-lift [box-shadow:var(--shadow-card),var(--shadow-inset-line)]"
            >
              {/* 호버 시 조명 효과 — 상단 중앙에서 흰 빛이 퍼짐 */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: 'var(--light-spotlight)' }}
              />
              <span className="relative font-mono text-xs font-bold text-graphite">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="relative font-bold">{f.title}</h3>
              <p className="relative text-sm leading-relaxed text-graphite">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
