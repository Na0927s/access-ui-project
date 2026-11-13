// (한국어 요약) 사이트 상단 헤더 — 대한항공 스타일 + 반응형(모바일 햄버거 드롭다운).
// 데스크톱(md+): 로고 + 가로 메뉴 + 언어 + 계정 메뉴 한 줄 배치.
// 모바일(<md): 로고 + 햄버거 버튼만 표시, 클릭 시 세로 드롭다운으로 메뉴·언어·계정 펼침.
// 사용자/개발자 모드 전환은 헤더가 아닌 페이지 내 버튼으로 유지.
import { useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false) // 모바일 드롭다운 열림 여부

  // 사람 모양 SVG 아이콘 (프로필 공통)
  const personIcon = (
    <svg viewBox="0 0 24 24" className="size-5 text-ink" fill="currentColor" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M12 14c-4.418 0-8 2.686-8 6v2h16v-2c0-3.314-3.582-6-8-6z" />
    </svg>
  )

  return (
    <header className="border-b border-rule bg-white shadow-soft">
      {/* 키보드 사용자용 "본문 바로가기" 링크 — 포커스될 때만 나타남 (접근성) */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
        본문 바로가기
      </a>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          {/* 좌측 그룹: 로고 + (데스크톱) 가로 메뉴 + 언어 전환 */}
          <div className="flex items-end gap-8 md:gap-12">
            {/* 로고: "CVDS" 표시. 마우스 호버 시 툴팁으로 풀네임 표시 */}
            <Link
              to="/"
              className="group relative inline-flex flex-col"
              aria-label={`${t('titleAbbr')} · ${t('title')}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="text-4xl font-bold leading-none tracking-tight md:text-5xl">
                {t('titleAbbr')}
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-max rounded-md border border-rule bg-white px-3 py-2 text-xs shadow-md group-hover:block"
              >
                <span className="block font-semibold text-ink">{t('titleFull')}</span>
                <span className="block text-graphite">{t('title')}</span>
              </span>
            </Link>

            {/* 데스크톱 가로 메뉴: md 이상에서만 표시 */}
            <nav
              aria-label="info"
              className="hidden items-center gap-x-6 text-lg leading-none md:flex md:text-xl"
            >
              <Link
                to="/about"
                className="rounded-md px-2 py-1 font-medium text-graphite transition-colors hover:text-ink"
              >
                {t('aboutLink')}
              </Link>
              <Link
                to="/terms"
                className="rounded-md px-2 py-1 font-medium text-graphite transition-colors hover:text-ink"
              >
                {t('termsLink')}
              </Link>
              {user && (
                <div className="group relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-graphite transition-colors hover:text-ink"
                  >
                    {t('myPage')}
                    <span aria-hidden className="text-xs">▾</span>
                  </button>
                  <div className="absolute left-0 top-full z-30 hidden min-w-max flex-col border-l-2 border-ink bg-white py-2 group-hover:flex group-focus-within:flex">
                    <Link
                      to="/mypage/info"
                      className="whitespace-nowrap px-4 py-1.5 text-sm font-medium text-graphite transition-colors hover:text-ink"
                    >
                      {t('myInfo')}
                    </Link>
                    <Link
                      to="/mypage/results"
                      className="whitespace-nowrap px-4 py-1.5 text-sm font-medium text-graphite transition-colors hover:text-ink"
                    >
                      {t('myResults')}
                    </Link>
                  </div>
                </div>
              )}
            </nav>

            {/* 데스크톱 언어 전환 (Kr/En) */}
            <div
              role="group"
              aria-label="Language"
              className="hidden items-center text-lg leading-none md:flex md:text-xl"
            >
              {(['ko', 'en'] as const).map((l, idx) => (
                <span key={l} className="flex items-center">
                  {idx === 1 && <span aria-hidden className="px-1 text-graphite">|</span>}
                  <button
                    type="button"
                    aria-pressed={lang === l}
                    onClick={() => setLang(l)}
                    className={`px-1 py-1 ${lang === l ? 'font-semibold text-ink' : 'text-graphite'}`}
                  >
                    {l === 'ko' ? 'Kr' : 'En'}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 우측 — 데스크톱 계정 메뉴 (md 이상) */}
          <div className="hidden md:block">
            {user ? (
              <div className="flex items-baseline gap-3 text-lg leading-none md:text-xl">
                <span className="flex items-baseline gap-1.5 whitespace-nowrap border-b border-ink px-2 py-1">
                  {personIcon}
                  {user.name} / {user.loginId}
                </span>
                <button
                  type="button"
                  className="flex items-baseline gap-1 whitespace-nowrap border-b border-ink px-2 py-1 font-medium transition-colors hover:text-graphite"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  <span aria-hidden>→</span>
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-baseline gap-3">
                <Link
                  to="/login"
                  className="whitespace-nowrap border-b border-ink px-2 py-1 text-lg leading-none md:text-xl"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/signup"
                  className="flex items-baseline gap-1 whitespace-nowrap border-b border-ink px-2 py-1 text-lg font-medium leading-none md:text-xl"
                >
                  <span aria-hidden>👤</span>
                  {t('signup')}
                </Link>
              </div>
            )}
          </div>

          {/* 모바일 햄버거 버튼 (md 미만에서만 표시) */}
          <button
            type="button"
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex size-10 items-center justify-center border-b-2 border-ink md:hidden"
          >
            {/* 햄버거 / X 아이콘 전환 */}
            <svg viewBox="0 0 24 24" className="size-6 text-ink" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              {mobileOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {/* 모바일 드롭다운 패널 (md 미만, 열렸을 때만) */}
        {mobileOpen && (
          <nav
            aria-label="mobile info"
            className="mt-4 flex flex-col gap-1 border-l-2 border-ink pl-4 md:hidden"
          >
            <Link
              to="/about"
              className="py-2 text-base font-medium text-graphite transition-colors hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              {t('aboutLink')}
            </Link>
            <Link
              to="/terms"
              className="py-2 text-base font-medium text-graphite transition-colors hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              {t('termsLink')}
            </Link>
            {user && (
              <>
                <Link
                  to="/mypage/info"
                  className="py-2 text-base font-medium text-graphite transition-colors hover:text-ink"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('myInfo')}
                </Link>
                <Link
                  to="/mypage/results"
                  className="py-2 text-base font-medium text-graphite transition-colors hover:text-ink"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('myResults')}
                </Link>
              </>
            )}
            {/* 모바일 언어 전환 */}
            <div role="group" aria-label="Language" className="flex items-center gap-2 py-2">
              {(['ko', 'en'] as const).map((l, idx) => (
                <span key={l} className="flex items-center">
                  {idx === 1 && <span aria-hidden className="px-1 text-graphite">|</span>}
                  <button
                    type="button"
                    aria-pressed={lang === l}
                    onClick={() => setLang(l)}
                    className={`px-1 py-1 text-base ${lang === l ? 'font-semibold text-ink' : 'text-graphite'}`}
                  >
                    {l === 'ko' ? 'Kr' : 'En'}
                  </button>
                </span>
              ))}
            </div>
            {/* 모바일 계정 메뉴 */}
            <div className="mt-2 flex flex-col gap-2 border-t border-rule pt-3">
              {user ? (
                <>
                  <span className="flex items-center gap-2 text-base font-semibold text-ink">
                    {personIcon}
                    {user.name} / {user.loginId}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 py-1 text-base font-medium text-graphite transition-colors hover:text-ink"
                    onClick={() => {
                      logout()
                      setMobileOpen(false)
                      navigate('/')
                    }}
                  >
                    <span aria-hidden>→</span>
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="py-1 text-base font-medium text-graphite transition-colors hover:text-ink"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('login')}
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center gap-1 py-1 text-base font-medium text-graphite transition-colors hover:text-ink"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span aria-hidden>👤</span>
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
