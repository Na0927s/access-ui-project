// (한국어 요약) 사이트 설명·약관 페이지 — 사이트 설명 페이지와 동일한 단일 박스 구조.
// 서비스 소개 도입부 + 분석 방식·개인정보 처리·한계 고지 섹션을 하나의 박스에 나열.
import { useT } from '../i18n/useT'

export default function TermsPage() {
  const t = useT()
  // 박스에 나열할 섹션 목록 (소제목 + 본문)
  const sections = [
    { title: t('termsAnalysisTitle'), body: t('termsAnalysisBody') },
    { title: t('termsPagePrivacyTitle'), body: t('termsPagePrivacyBody') },
    { title: t('termsLimitTitle'), body: t('termsLimitBody') },
    { title: t('termsAspireTitle'), body: t('termsAspireBody') },
  ]
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-5 leading-relaxed">
      {/* 페이지 헤더 + 마지막 업데이트 */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('siteInfo')}</h1>
        <p className="text-xs text-graphite">{t('termsUpdated')}</p>
      </header>

      {/* 단일 박스: 도입부 + 각 섹션(소제목 + 본문)을 사이트 설명 페이지와 동일하게 나열 */}
      <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-white p-6 text-sm shadow-sm md:p-8">
        {/* 도입부 (서비스 소개) */}
        <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
          {t('termsIntro')}
        </p>
        {sections.map((s) => (
          <div key={s.title} className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold">{s.title}</h2>
            <p className="text-graphite">{s.body}</p>
          </div>
        ))}
      </div>
    </article>
  )
}
