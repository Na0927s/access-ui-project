// (한국어 요약) 메인(홈) 페이지 — 서비스 소개 문구와 개발자/사용자 모드 선택 카드 표시
import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'

export default function MainPage() {
  const t = useT()
  // 두 개의 모드 선택 카드 데이터 (아이콘은 장식)
  const cards = [
    { to: '/developer', title: t('developer'), desc: t('developerDesc'), icon: '</>' },
    { to: '/user', title: t('user'), desc: t('userDesc'), icon: '▣' },
  ]
  return (
    <div className="flex flex-col gap-10">
      {/* 상단 소개: 태그라인 + 리드 문구 */}
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{t('tagline')}</h1>
        <p className="mt-3 text-graphite">{t('lead')}</p>
      </section>
      {/* Developer on the left, user on the right (per the screen design).
          (한국어) 카드 배치: 왼쪽 개발자, 오른쪽 사용자 (화면 설계서 기준) */}
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((c) => (
          // hover 시 배경이 검정으로 뒤집히는 카드 — group 클래스로 자식 요소도 함께 스타일 변경
          <Link
            key={c.to}
            to={c.to}
            className="group flex min-h-64 flex-col justify-between rounded-lg border border-ink bg-white p-8 hover:bg-ink hover:text-white"
          >
            <span aria-hidden className="font-mono text-2xl">{c.icon}</span>
            <span>
              <span className="block text-2xl font-bold">{c.title}</span>
              <span className="mt-2 block text-graphite group-hover:text-white/80">{c.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
