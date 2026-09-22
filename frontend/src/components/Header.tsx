import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n/useT'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'

export default function Header() {
  const t = useT()
  const { lang, setLang } = useUiStore()
  const user = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <header className="border-b border-rule bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">본문 바로가기</a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="text-xl font-bold tracking-tight">{t('title')}</Link>

        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 rounded-md border border-rule px-3 py-2">
              <span aria-hidden className="grid size-8 place-items-center rounded-full border border-rule text-sm">
                {user.name.slice(0, 1)}
              </span>
              <span className="text-sm">{user.name} / {user.loginId}</span>
              <Link to="/mypage/info" className="text-sm underline underline-offset-4">{t('myInfo')}</Link>
              <Link to="/mypage/results" className="text-sm underline underline-offset-4">{t('myResults')}</Link>
              <button
                type="button"
                className="rounded border border-ink px-2 py-1 text-sm"
                onClick={() => { logout(); navigate('/') }}
              >
                {t('logout')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="rounded border border-ink px-3 py-1.5 text-sm">{t('login')}</Link>
              <Link to="/signup" className="rounded bg-ink px-3 py-1.5 text-sm text-white">{t('signup')}</Link>
            </div>
          )}

          <div role="group" aria-label="Language" className="flex overflow-hidden rounded border border-ink text-sm">
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
