// (한국어 요약) 사이트 상단 헤더 — 대한항공 스타일 2단 구조.
// 1줄(유틸리티 바): 로그인/회원가입 + 언어(Kr/En) 전환 — 얇은 회색 바
// 2줄(메인 바): 로고(CVDS) 좌측 + 가로 메뉴(소개·약관·마이페이지) 우측
// 사용자/개발자 모드 전환은 헤더가 아닌 페이지 내 버튼으로 유지.
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

      {/* --- 메인 바 — 로고+언어전환+가로 메뉴(좌) + 계정 메뉴(우) --- */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          {/* 좌측 그룹: 로고 + 가로 메뉴 + 언어 전환 (하단선 맞춤) */}
          <div className="flex items-end gap-8 sm:gap-12">
          {/* 로고: "CVDS" 표시. 마우스 호버 시 아래 네모 박스에 풀네임(영문+한글)이 뜸 */}
          <Link
            to="/"
            className="group relative inline-flex flex-col"
            aria-label={`${t('titleAbbr')} · ${t('title')}`}
          >
            <span className="text-4xl font-bold leading-none tracking-tight md:text-5xl">
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

          {/* 가로 메뉴: 소개·약관·마이페이지 (로그인 시 내정보/결과내역) */}
          <nav
            aria-label="info"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg leading-none sm:text-xl"
          >
            <Link
              to="/about"
              className="rounded-md px-2 py-1 font-medium text-graphite transition-colors hover:bg-paper hover:text-ink"
            >
              {t('aboutLink')}
            </Link>
            <Link
              to="/terms"
              className="rounded-md px-2 py-1 font-medium text-graphite transition-colors hover:bg-paper hover:text-ink"
            >
              {t('termsLink')}
            </Link>
            {/* 로그인 시에만 마이페이지 드롭다운 노출 — hover 시 내정보/결과내역 펼침 */}
            {user && (
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-graphite transition-colors hover:bg-paper hover:text-ink"
                >
                  {t('myPage')}
                  <span aria-hidden className="text-xs">▾</span>
                </button>
                {/* 드롭다운: 부모(.group)에 hover/focus-within 시 표시. 키보드 접근성 포함 */}
                <div className="absolute left-0 top-full z-30 hidden min-w-max flex-col rounded-md border border-rule bg-white py-1 shadow-md group-hover:flex group-focus-within:flex">
                  <Link
                    to="/mypage/info"
                    className="whitespace-nowrap px-4 py-2 text-sm font-medium text-graphite transition-colors hover:bg-paper hover:text-ink"
                  >
                    {t('myInfo')}
                  </Link>
                  <Link
                    to="/mypage/results"
                    className="whitespace-nowrap px-4 py-2 text-sm font-medium text-graphite transition-colors hover:bg-paper hover:text-ink"
                  >
                    {t('myResults')}
                  </Link>
                </div>
              </div>
            )}
          </nav>

          {/* 언어 전환 (Kr/En): 가로 메뉴 오른쪽. 겉 테두리 없이 가운데 작대기만.
              aria-pressed로 현재 선택 상태를 스크린리더에 알림 */}
          <div
            role="group"
            aria-label="Language"
            className="flex items-center text-lg leading-none sm:text-xl"
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

          {/* 우측: 로그인 시 이름/아이디 + 로그아웃. 비로그인 시 로그인/회원가입.
              모두 메뉴와 같은 하단선·크기·leading-none 적용 */}
          {user ? (
            <div className="flex items-baseline gap-3 text-lg leading-none sm:text-xl">
              {/* 이름/아이디: 메뉴와 같은 언더바 스타일. 이니셜은 작게 */}
              <span className="flex items-baseline gap-1.5 whitespace-nowrap border-b border-ink px-2 py-1">
                <svg viewBox="0 0 24 24" className="size-5 text-ink" fill="currentColor" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M12 14c-4.418 0-8 2.686-8 6v2h16v-2c0-3.314-3.582-6-8-6z" />
                </svg>
                {user.name} / {user.loginId}
              </span>
              {/* 로그아웃: 출구(→) 아이콘. 메뉴와 같은 언더바 */}
              <button
                type="button"
                className="flex items-baseline gap-1 whitespace-nowrap border-b border-ink px-2 py-1 font-medium hover:bg-paper"
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
              {/* 로그인: 메뉴와 같은 하단선. 패딩을 메뉴 링크(px-2 py-1)와 통일 */}
              <Link
                to="/login"
                className="whitespace-nowrap border-b border-ink px-2 py-1 text-lg leading-none sm:text-xl"
              >
                {t('login')}
              </Link>
              {/* 회원가입: 사람 아이콘 + 언더바. 로그인 오른쪽, 같은 라인/크기 */}
              <Link
                to="/signup"
                className="flex items-baseline gap-1 whitespace-nowrap border-b border-ink px-2 py-1 text-lg font-medium leading-none sm:text-xl"
              >
                <span aria-hidden>👤</span>
                {t('signup')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
