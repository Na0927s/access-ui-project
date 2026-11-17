// (한국어 요약) 사이트 상단 헤더 — 에디토리얼/기업 사이트 톤(미니멀 가는 선).
// 높이 약 64px, 흰 배경, 아래 전체 폭 1px 연회색 구분선, 그림자 없음.
// 좌측: 굵은 로고 CVDS + 메뉴(사이트 설명/이용약관). 우측: Kr|En 언어전환 + 로그인/회원가입.
// 로그인 상태: 마이페이지 드롭다운 + 로그아웃 (기존 동작·접근성 유지).
import { useEffect, useRef, useState } from 'react'
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
  // 데스크톱 "마이페이지" 드롭다운 — hover와 키보드 토글 모두로 열림.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!menuBtnRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuBtnRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // 사람 모양 SVG 아이콘 (1.5px 라인) — 회원가입/로그인 사용자 표시
  const personIcon = (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" strokeLinecap="round" />
    </svg>
  )

  return (
    <header className="border-b border-line bg-white">
      {/* 키보드 사용자용 "본문 바로가기" 링크 — 포커스될 때만 나타남 (접근성) */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
        {t('skipToMain')}
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* 좌측 그룹: 로고 + (데스크톱) 가로 메뉴 */}
        <div className="flex items-center gap-8">
          {/* 로고: "CVDS" 표시 (20px 아주 굵게). 풀네임은 aria-label로 제공 */}
          <Link
            to="/"
            className="text-xl font-extrabold leading-none tracking-tight text-ink"
            aria-label={`${t('titleAbbr')} · ${t('title')}`}
            onClick={() => setMobileOpen(false)}
          >
            {t('titleAbbr')}
          </Link>

          {/* 데스크톱 가로 메뉴: md 이상에서만 표시 (14px 진한 회색) */}
          <nav aria-label="info" className="hidden items-center gap-x-6 text-sm md:flex">
            <Link
              to="/about"
              className="font-medium text-graphite transition-colors hover:text-ink"
            >
              {t('aboutLink')}
            </Link>
            <Link
              to="/terms"
              className="font-medium text-graphite transition-colors hover:text-ink"
            >
              {t('termsLink')}
            </Link>
            {user && (
              <div
                className="relative"
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  ref={menuBtnRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1 font-medium text-graphite transition-colors hover:text-ink"
                >
                  {t('myPage')}
                  <span aria-hidden className="text-[10px]">▾</span>
                </button>
                {menuOpen && (
                  <div
                    ref={menuRef}
                    role="menu"
                    className="absolute left-0 top-full z-30 flex min-w-max flex-col border border-line bg-white py-1"
                  >
                    <Link
                      to="/mypage/info"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="whitespace-nowrap px-4 py-1.5 text-sm font-medium text-graphite transition-colors hover:bg-mist hover:text-ink"
                    >
                      {t('myInfo')}
                    </Link>
                    <Link
                      to="/mypage/results"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="whitespace-nowrap px-4 py-1.5 text-sm font-medium text-graphite transition-colors hover:bg-mist hover:text-ink"
                    >
                      {t('myResults')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* 우측 — 데스크톱: 언어 전환 + 계정 메뉴 (13px) */}
        <div className="hidden items-center gap-4 md:flex">
          {/* 언어 전환 (Kr | En) — 선택된 쪽만 굵은 검정, 나머지 옅은 회색, 사이 옅은 세로선 */}
          <div role="group" aria-label="Language" className="flex items-center text-[13px] leading-none">
            {(['ko', 'en'] as const).map((l, idx) => (
              <span key={l} className="flex items-center">
                {idx === 1 && <span aria-hidden className="mx-1.5 h-3 w-px bg-line" />}
                <button
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={lang === l ? 'font-bold text-ink' : 'text-faint'}
                >
                  {l === 'ko' ? 'Kr' : 'En'}
                </button>
              </span>
            ))}
          </div>

          {user ? (
            <div className="flex items-center gap-3 text-[13px] leading-none">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-ink">
                {personIcon}
                {user.name} / {user.loginId}
              </span>
              <button
                type="button"
                className="whitespace-nowrap border-b border-ink pb-0.5 font-medium transition-colors hover:text-graphite"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                {t('logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[13px] leading-none">
              <Link
                to="/login"
                className="whitespace-nowrap border-b border-ink pb-0.5 text-ink"
              >
                {t('login')}
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-1 whitespace-nowrap border-b border-ink pb-0.5 font-medium text-ink"
              >
                {personIcon}
                {t('signup')}
              </Link>
            </div>
          )}
        </div>

        {/* 모바일 햄버거 버튼 (md 미만에서만 표시) */}
        <button
          type="button"
          aria-label={t('openMenu')}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex size-9 items-center justify-center md:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-5 text-ink" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
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
          className="border-t border-line px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            <Link
              to="/about"
              className="py-2 text-sm font-medium text-graphite transition-colors hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              {t('aboutLink')}
            </Link>
            <Link
              to="/terms"
              className="py-2 text-sm font-medium text-graphite transition-colors hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              {t('termsLink')}
            </Link>
            {user && (
              <>
                <Link
                  to="/mypage/info"
                  className="py-2 text-sm font-medium text-graphite transition-colors hover:text-ink"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('myInfo')}
                </Link>
                <Link
                  to="/mypage/results"
                  className="py-2 text-sm font-medium text-graphite transition-colors hover:text-ink"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('myResults')}
                </Link>
              </>
            )}
            {/* 모바일 언어 전환 */}
            <div role="group" aria-label="Language" className="flex items-center gap-2 py-2 text-sm">
              {(['ko', 'en'] as const).map((l, idx) => (
                <span key={l} className="flex items-center">
                  {idx === 1 && <span aria-hidden className="mx-1.5 h-3 w-px bg-line" />}
                  <button
                    type="button"
                    aria-pressed={lang === l}
                    onClick={() => setLang(l)}
                    className={lang === l ? 'font-bold text-ink' : 'text-faint'}
                  >
                    {l === 'ko' ? 'Kr' : 'En'}
                  </button>
                </span>
              ))}
            </div>
            {/* 모바일 계정 메뉴 */}
            <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
              {user ? (
                <>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {personIcon}
                    {user.name} / {user.loginId}
                  </span>
                  <button
                    type="button"
                    className="py-1 text-sm font-medium text-graphite transition-colors hover:text-ink"
                    onClick={() => {
                      logout()
                      setMobileOpen(false)
                      navigate('/')
                    }}
                  >
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="py-1 text-sm font-medium text-graphite transition-colors hover:text-ink"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t('login')}
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center gap-1 py-1 text-sm font-medium text-graphite transition-colors hover:text-ink"
                    onClick={() => setMobileOpen(false)}
                  >
                    {personIcon}
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
