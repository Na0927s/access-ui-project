// (한국어 요약) 사이트 설명·약관 페이지 — 서비스 소개, 분석 방식, 개인정보 처리, 한계 고지
import { useT } from '../i18n/useT'

export default function TermsPage() {
  const t = useT()
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 py-8 leading-relaxed md:py-10">
      <h1 className="text-2xl font-bold">{t('siteInfo')}</h1>
      {/* 서비스 성격 소개 */}
      <p>{t('termsIntro')}</p>
      <h2 className="text-lg font-bold">{t('termsAnalysisTitle')}</h2>
      {/* 사용 알고리즘 요약 + 자체 지표 고지 */}
      <p>{t('termsAnalysisBody')}</p>
      <h2 className="text-lg font-bold">{t('termsPagePrivacyTitle')}</h2>
      {/* 저장 정책(로그인/비로그인 차등) 안내 */}
      <p>{t('termsPagePrivacyBody')}</p>
      <h2 className="text-lg font-bold">{t('termsLimitTitle')}</h2>
      {/* 서비스 한계 고지 (정직한 안내) */}
      <p>{t('termsLimitBody')}</p>
    </article>
  )
}
