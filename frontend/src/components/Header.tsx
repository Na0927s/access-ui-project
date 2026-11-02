// (한국어 요약) 사이트 상단 헤더 — 로고, 로그인 상태별 메뉴, 언어(Kr/En) 전환 버튼
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        {/* 좌측 로고 (홈으로 이동) */}
        <Link to="/" className="text-xl font-bold tracking-tight">
          {t('title')}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {/* 로그인 상태에 따라 두 가지 UI 중 하나 표시 */}
          {user ? (
            // 로그인됨: 프로필 이니셜 + 이름/ID + 마이페이지 링크 + 로그아웃 버튼
            <div className="flex items-center gap-3 rounded-md border border-rule px-3 py-2">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full border border-rule text-sm"
              >
                {user.name.slice(0, 1)}
              </span>
              <span className="text-sm">
                {user.name} / {user.loginId}
              </span>
              <Link to="/mypage/info" className="text-sm underline underline-offset-4">
                {t('myInfo')}
              </Link>
              <Link to="/mypage/results" className="text-sm underline underline-offset-4">
                {t('myResults')}
              </Link>
              {/* 로그아웃: 상태 초기화 후 홈으로 이동 */}
              <button
                type="button"
                className="rounded border border-ink px-2 py-1 text-sm"
                onClick={() => {
                  logout()
                  navigate('/')
                }} // logout은 async지만 화면 이동이 먼저여도 무방
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
    </header>
  )
}
