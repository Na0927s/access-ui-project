// (한국어 요약) 사이트 하단 푸터 — 서비스명·팀명·소속 대학 표시.
// 사이트 소개/약관 링크는 홈과 소개 페이지에서만 노출 (푸터에는 팀 정보만).
// 모든 문구는 i18n 카탈로그에서 가져온다 (한/영 전환 대응).
import { useT } from '../i18n/useT'

export default function Footer() {
  const t = useT()
  return (
    <footer className="border-t border-rule bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-graphite">
        <span className="font-semibold text-ink">CVDS</span>
        <span>{t('aboutProject')}</span>
        <span>
          {t('teamLabel')}: {t('teamName')}
        </span>
        <span>{t('univName')}</span>
      </div>
    </footer>
  )
}
