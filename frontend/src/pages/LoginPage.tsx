// (한국어 요약) 로그인 페이지 — ID/비밀번호 입력 후 백엔드 DB로 인증.
// 성공하면 홈으로 이동, 실패하면 백엔드 에러 메시지 표시.
// 토큰/쿠키는 쓰지 않고 메모리(currentUser)에만 로그인 상태 유지 (규칙 1).
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SessionNotice from '../components/SessionNotice'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const ok = await login(loginId, password)  // 백엔드에서 비밀번호(bcrypt) 검증
    if (ok) navigate('/')                       // 로그인 성공 → 홈으로
    else setError(useAuthStore.getState().error ?? 'ID 또는 비밀번호가 올바르지 않습니다.')
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-bold">로그인</h1>
      <SessionNotice />
      <form onSubmit={submit} className="flex flex-col gap-4">
        {/* autoComplete 속성으로 비밀번호 관리자 지원 */}
        <label className="flex flex-col gap-1 text-sm font-semibold">
          ID
          <input value={loginId} onChange={(e) => setLoginId(e.target.value)} required autoComplete="username"
            className="rounded border border-graphite bg-white px-3 py-2 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          비밀번호
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            className="rounded border border-graphite bg-white px-3 py-2 font-normal" />
        </label>
        {error && <p role="alert" className="font-medium text-red-800">✕ {error}</p>}
        <button type="submit" disabled={loading}
          className="rounded bg-ink py-2.5 font-semibold text-white disabled:opacity-60">
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
      {/* 계정이 없는 사용자를 회원가입으로 안내 */}
      <p className="text-center text-sm">계정이 없나요? <Link to="/signup" className="underline underline-offset-4">회원가입</Link></p>
    </div>
  )
}
