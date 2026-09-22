import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SessionNotice from '../components/SessionNotice'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (await login(loginId, password)) navigate('/')
    else setError('ID 또는 비밀번호가 올바르지 않습니다.')
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-bold">로그인</h1>
      <SessionNotice />
      <form onSubmit={submit} className="flex flex-col gap-4">
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
        <button type="submit" className="rounded bg-ink py-2.5 font-semibold text-white">로그인</button>
      </form>
      <p className="text-center text-sm">계정이 없나요? <Link to="/signup" className="underline underline-offset-4">회원가입</Link></p>
    </div>
  )
}
