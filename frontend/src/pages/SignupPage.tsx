// (한국어 요약) 회원가입 페이지 — 이름/이메일/ID/비밀번호 입력과 약관 동의를 받는 폼.
// 백엔드 DB에 계정을 생성하고 비밀번호는 bcrypt로 해시해 저장 (규칙 2).
// ID 중복 확인은 /api/auth/check-id, 가입은 /api/auth/signup 호출.
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import SessionNotice from '../components/SessionNotice'
import { checkLoginId } from '../api/client'
import { useAuthStore } from '../stores/authStore'

// 화면에 표시할 약관 항목 정의 (모두 필수 동의)
const TERMS = [
  { id: 'service', title: '이용약관 (필수)', body: '본 서비스는 학교 팀 프로젝트로 제작된 웹 접근성 분석 서비스입니다. 분석 결과는 참고용이며 공식 인증을 대신하지 않습니다.' },
  { id: 'privacy', title: '개인정보 수집·이용 (필수)', body: '입력한 이름·이메일·ID, 그리고 로그인 시 분석 결과는 서버 DB에 저장됩니다. 비밀번호는 bcrypt 해시로만 저장됩니다. 업로드한 이미지는 분석 후 서버에 저장하지 않습니다.' },
]

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup, loading } = useAuthStore()
  // 폼 입력값을 하나의 객체 상태로 관리
  const [form, setForm] = useState({ name: '', email: '', loginId: '', password: '', passwordConfirm: '' })
  const [idChecked, setIdChecked] = useState<null | boolean>(null) // ID 중복 확인 결과 (null=미확인)
  const [checkingId, setCheckingId] = useState(false)               // ID 중복 확인 진행 중
  const [agreed, setAgreed] = useState<Record<string, boolean>>({}) // 약관별 동의 상태
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false) // 가입 완료 → 완료 모달 표시

  // 입력값 변경 처리. ID가 바뀌면 이전 중복 확인 결과를 초기화 (다시 확인해야 함)
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value })
    if (k === 'loginId') setIdChecked(null)
  }

  // ID 중복 확인: 백엔드 /api/auth/check-id 호출
  const checkId = async () => {
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(form.loginId)) {
      setError('ID는 영문·숫자·_ 4~20자로 입력해주세요.')
      return
    }
    setError(null)
    setCheckingId(true)
    try {
      const available = await checkLoginId(form.loginId)
      setIdChecked(available)
    } catch {
      setError('ID 중복 확인 중 오류가 발생했습니다.')
      setIdChecked(null)
    } finally {
      setCheckingId(false)
    }
  }

  // 제출 전 폼 검증: 문제가 있으면 에러 문구, 모두 통과하면 null 반환
  const validate = (): string | null => {
    if (!form.name || !form.email || !form.loginId || !form.password) return '모든 항목을 입력해주세요.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return '이메일 형식을 확인해주세요.'
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(form.loginId)) return 'ID는 영문·숫자·_ 4~20자로 입력해주세요.'
    if (idChecked !== true) return 'ID 중복 확인을 해주세요.'       // 중복 확인 필수
    if (form.password.length < 8) return '비밀번호는 8자 이상 입력해주세요.'
    if (form.password !== form.passwordConfirm) return '비밀번호가 일치하지 않습니다.'
    if (!TERMS.every((t) => agreed[t.id])) return '약관에 동의해주세요.'  // 약관 전부 동의 필수
    return null
  }

  // 폼 제출: 검증 통과 시 백엔드에 회원가입 요청 → 성공 시 자동 로그인 후 완료 모달
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err = validate()
    setError(err)
    if (err) return
    const ok = await signup(form)
    if (ok) setDone(true)
    else setError(useAuthStore.getState().error ?? '회원가입에 실패했습니다.')
  }

  // 입력 필드를 생성하는 재사용 가능한 헬퍼 (라벨 + input 한 세트)
  const field = (k: keyof typeof form, label: string, type = 'text') => (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input type={type} value={form[k]} onChange={set(k)} required
        className="rounded border border-graphite bg-white px-3 py-2 font-normal" />
    </label>
  )

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold">회원가입</h1>
      {/* 데이터가 서버에 저장된다는 안내 배너 */}
      <SessionNotice />
      {/* noValidate: 브라우저 기본 검증 대신 위의 validate()를 사용하겠다는 뜻 */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {field('name', '이름')}
        {field('email', '이메일', 'email')}
        {/* ID 입력 + 중복 확인 버튼을 한 줄에 배치 */}
        <div className="flex items-end gap-2">
          <div className="flex-1">{field('loginId', 'ID')}</div>
          {/* 중복 확인: 백엔드에 물어봐 사용 가능 여부 표시 */}
          <button type="button" className="rounded border border-ink px-3 py-2 text-sm"
            onClick={checkId} disabled={checkingId}>
            {checkingId ? '확인 중…' : 'ID 확인'}
          </button>
        </div>
        {/* 확인 결과 안내 (role="status": 결과 통보용 알림) */}
        {idChecked !== null && (
          <p role="status" className="text-sm">{idChecked ? '✓ 사용할 수 있는 ID입니다.' : '✕ 이미 사용 중인 ID입니다.'}</p>
        )}
        {field('password', '비밀번호', 'password')}
        {field('passwordConfirm', '비밀번호 확인', 'password')}

        {/* 약관 항목: 스크롤 가능한 본문 + 동의 체크박스 */}
        {TERMS.map((term) => (
          <div key={term.id} className="rounded border border-rule bg-white p-3">
            <p className="font-semibold">{term.title}</p>
            <p className="my-2 max-h-24 overflow-y-auto text-sm text-graphite">{term.body}</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!agreed[term.id]}
                onChange={(e) => setAgreed({ ...agreed, [term.id]: e.target.checked })} />
              동의합니다
            </label>
          </div>
        ))}

        {error && <p role="alert" className="font-medium text-red-800">✕ {error}</p>}
        <button type="submit" disabled={loading}
          className="self-center rounded bg-ink px-6 py-2.5 font-semibold text-white disabled:opacity-60">
          {loading ? '가입 중…' : '회원가입'}
        </button>
      </form>

      {/* 가입 완료 모달: 닫으면 로그인 페이지로 이동 */}
      {done && (
        <Modal title="회원가입 완료" onClose={() => navigate('/')}>
          <p>{form.name}님, 가입이 완료되어 로그인되었습니다.</p>
        </Modal>
      )}
    </div>
  )
}
