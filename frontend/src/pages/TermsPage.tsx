// (한국어 요약) 사이트 설명·약관 페이지 — 박스 레이아웃으로 재구성.
// 서비스 소개, 분석 방식, 개인정보 처리, 한계 고지를 각각의 카드 박스로 배치해
// 가독성과 구조를 개선. 항목별 헤더 + 본문 + 접기/펼치기 가능.
import { useState } from 'react'
import { useT } from '../i18n/useT'

// 박스 하나: 제목 + 본문(접기/펼치기). 기본 펼침.
function TermsBox({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="overflow-hidden rounded-xl border border-rule bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <h2 className="text-base font-bold">{title}</h2>
        {/* 접기/펼치기 화살표 (텍스트로 표시 — 색만으로 상태 전달 금지 규칙) */}
        <span aria-hidden="true" className="text-sm text-graphite">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="border-t border-rule px-5 py-4 text-sm leading-relaxed text-graphite">
          {children}
        </div>
      )}
    </section>
  )
}

export default function TermsPage() {
  const t = useT()
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-5">
      {/* 페이지 헤더 + 마지막 업데이트 */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('siteInfo')}</h1>
        <p className="text-xs text-graphite">{t('termsUpdated')}</p>
      </header>

      {/* 서비스 소개 — 도입부는 항상 보이도록 별도 박스 */}
      <section className="rounded-xl border border-rule bg-white p-5 shadow-sm">
        <p className="text-sm leading-relaxed">{t('termsIntro')}</p>
      </section>

      {/* 분석 방식 박스 */}
      <TermsBox title={t('termsAnalysisTitle')}>
        <p>{t('termsAnalysisBody')}</p>
      </TermsBox>

      {/* 개인정보 처리 박스 */}
      <TermsBox title={t('termsPagePrivacyTitle')}>
        <p>{t('termsPagePrivacyBody')}</p>
      </TermsBox>

      {/* 한계 고지 박스 */}
      <TermsBox title={t('termsLimitTitle')}>
        <p>{t('termsLimitBody')}</p>
      </TermsBox>
    </article>
  )
}
