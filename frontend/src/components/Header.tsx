// (한국어 요약) 사이트 상단 헤더 — 로고, 로그인 상태별 메뉴, 언어(Kr/En) 전환 버튼
// 레이아웃: 1줄(로고 + 사용자/언어), 2줄(사이트 설명·약관·마이페이지 링크)
// 사용자박스는 이니셜/이름/로그아웃만 남겨 한 줄 오버플로우(줄바꿈)를 방지.
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n/useT'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'

export default function Header() {
  const t = useT()
  const { lang, setLang } = useUiStore()
  const user = useAuthStore((s) => s.currentUser) // 로그인한 사용자 (없으면 null)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <header className="border-b border-rule bg-white">
      {/* 키보드 사용자용 "본문 바로가기" 링크 — 포커스될 때만 나타남 (접근성) */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
        본문 바로가기
      </a>
      {/* 좌우 패딩을 같게(px-4) — 좁은 화면에서 로고 음수 마진이 화면 밖으로 나가는 것 방지.
          넓은 화면 느낌은 아래 로고 Link의 xl 음수 마진으로 복원. */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* --- 1줄: 로고 + 사용자 메뉴/언어 전환 --- */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          {/* 로고: "CVDS" 표시. 마우스 호버 시 아래 네모 박스에 풀네임(영문+한글)이 뜸 */}
          <Link
            to="/"
            className="group relative inline-flex flex-col mt-2 sm:mt-4 xl:-ml-10 2xl:-ml-16"
            aria-label={`${t('titleAbbr')} · ${t('title')}`}
          >
            <span className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              {t('titleAbbr')}
            </span>
            {/* 호버 툴팁 박스: 영문 풀네임 + 언어별 이름(한글/영문) */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-max rounded-md border border-rule bg-white px-3 py-2 text-xs shadow-md group-hover:block"
            >
              <span className="block font-semibold text-ink">{t('titleFull')}</span>
              <span className="block text-graphite">{t('title')}</span>
            </span>
          </Link>

          {/* 우측: 로그인 상태별 메뉴 + 언어 전환. flex-nowrap으로 한 줄 유지 */}
          <div className="flex flex-nowrap items-center gap-2 sm:gap-3">
            {user ? (
              // 로그인됨: 프로필 이니셜 + 이름/ID + 로그아웃 (내정보·결과내역은 아래 nav로 이동)
              <div className="flex flex-nowrap items-center gap-2 rounded-md border border-rule px-3 py-1.5">
                <span
                  aria-hidden
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-rule text-xs"
                >
                  {user.name.slice(0, 1)}
                </span>
                <span className="whitespace-nowrap text-xs sm:text-sm">
                  {user.name} / {user.loginId}
                </span>
                {/* 로그아웃: 상태 초기화 후 홈으로 이동 */}
                <button
                  type="button"
                  className="whitespace-nowrap rounded border border-ink px-2 py-1 text-xs sm:text-sm"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              // 비로그인: 로그인/회원가입 버튼
              <div className="flex gap-2">
                <Link to="/login" className="rounded border border-ink px-3 py-1.5 text-sm">
                  {t('login')}
                </Link>
                <Link to="/signup" className="rounded bg-ink px-3 py-1.5 text-sm text-white">
                  {t('signup')}
                </Link>
              </div>
            )}

            {/* 언어 전환 (Kr/En): aria-pressed로 현재 선택 상태를 스크린리더에 알림 */}
            <div
              role="group"
              aria-label="Language"
              className="flex overflow-hidden rounded border border-ink text-sm"
            >
              {(['ko', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 ${lang === l ? 'bg-ink text-white font-semibold' : ''}`}
                >
                  {l === 'ko' ? 'Kr' : 'En'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- 2줄: 사이트 설명·약관·마이페이지 링크 (로고 줄 아래에 별도 배치) --- */}
        {/* 가운데보다 살짝 왼쪽: justify-center + 우측 패딩으로 중심을 왼쪽으로 치우치게 */}
        <nav
          aria-label="info"
          className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pr-16 text-lg sm:pr-32 sm:text-xl"
        >
          <Link
            to="/about"
            className="rounded-md px-3 py-1.5 text-graphite transition-colors hover:bg-paper hover:text-ink"
          >
            {t('aboutLink')}
          </Link>
          <Link
            to="/terms"
            className="rounded-md px-3 py-1.5 text-graphite transition-colors hover:bg-paper hover:text-ink"
          >
            {t('termsLink')}
          </Link>
          {/* 로그인 시에만 마이페이지 링크 노출 (사용자박스에서 옮겨옴) */}
          {user && (
            <>
              <Link
                to="/mypage/info"
                className="rounded-md px-3 py-1.5 text-graphite transition-colors hover:bg-paper hover:text-ink"
              >
                {t('myInfo')}
              </Link>
              <Link
                to="/mypage/results"
                className="rounded-md px-3 py-1.5 text-graphite transition-colors hover:bg-paper hover:text-ink"
              >
                {t('myResults')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
