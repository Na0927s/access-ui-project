// (한국어 요약) 사이트 하단 푸터 — 팀 정보와 약관 페이지 링크 표시
import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'

export default function Footer() {
  const t = useT()
  return (
    <footer className="border-t border-rule bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-graphite">
        <p>{t('footer')}</p>
        <Link to="/terms" className="underline underline-offset-4">
          {t('siteInfo')}
        </Link>
      </div>
    </footer>
  )
}
