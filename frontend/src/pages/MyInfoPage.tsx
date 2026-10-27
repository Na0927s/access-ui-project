// (한국어 요약) 마이페이지 > 내 정보 — 로그인한 사용자의 이름/이메일 조회·수정,
// 비밀번호 변경, 회원 탈퇴. 모두 백엔드 DB에 반영 (규칙 2).
// (RequireLogin으로 보호되어 currentUser가 항상 존재함 — ! 단언 사용)
import { useState } from 'react'
import Modal from '../components/Modal'
import SessionNotice from '../components/SessionNotice'
import { useAuthStore } from '../stores/authStore'

export default function MyInfoPage() {
  const user = useAuthStore((s) => s.currentUser)!
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const changePassword = useAuthStore((s) => s.changePassword)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const loading = useAuthStore((s) => s.loading)

  const [editing, setEditing] = useState(false)   // 프로필 수정 모드 여부
  const [name, setName] = useState(user.name)      // 편집 중인 이름
  const [email, setEmail] = useState(user.email)   // 편집 중인 이메일
  const [saved, setSaved] = useState(false)        // 저장 완료 표시
  const [profileError, setProfileError] = useState<string | null>(null)

  // 비밀번호 변경 모달 상태
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwDone, setPwDone] = useState(false)

  // 회원 탈퇴 확인 모달
  const [quitOpen, setQuitOpen] = useState(false)

  // 확인 버튼: 수정 모드였다면 백엔드에 반영 후 수정 모드 종료
  const confirm = async () => {
    if (!editing) return
    setProfileError(null)
    const ok = await updateProfile({ name, email })
    if (ok) {
      setEditing(false)
      setSaved(true)
    } else {
      setProfileError(useAuthStore.getState().error ?? '수정에 실패했습니다.')
    }
  }

  // 비밀번호 변경 제출
  const submitPassword = async () => {
    setPwError(null)
    if (pwForm.next.length < 8) { setPwError('새 비밀번호는 8자 이상 입력해주세요.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('새 비밀번호가 일치하지 않습니다.'); return }
    const ok = await changePassword(pwForm.current, pwForm.next)
    if (ok) {
      setPwDone(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => { setPwOpen(false); setPwDone(false) }, 1500)
    } else {
      setPwError(useAuthStore.getState().error ?? '비밀번호 변경에 실패했습니다.')
    }
  }

  // 회원 탈퇴 확인
  const confirmQuit = async () => {
    const ok = await deleteAccount()
    if (!ok) setProfileError(useAuthStore.getState().error ?? '탈퇴에 실패했습니다.')
    // 성공 시 deleteAccount가 currentUser를 null로 만들어 RequireLogin이 /login으로 보냄.
  }

  // 입력 행(라벨+input) 생성 헬퍼.
  // onChange가 없으면(=ID처럼 수정 불가 항목이면) 읽기 전용으로 표시
  const row = (label: string, value: string, onChange?: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input value={value} readOnly={!onChange || !editing} onChange={(e) => onChange?.(e.target.value)}
        className={`rounded border px-3 py-2 font-normal ${editing && onChange ? 'border-ink bg-white' : 'border-rule bg-paper'}`} />
    </label>
  )

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold">내 정보</h1>
      {/* 프로필 아바타 대신 이름 이니셜 원형 표시 */}
      <div aria-hidden className="mx-auto grid size-28 place-items-center rounded-full border-2 border-ink text-4xl">
        {user.name.slice(0, 1)}
      </div>
      {row('이름', name, setName)}      {/* 수정 가능 */}
      {row('이메일', email, setEmail)}   {/* 수정 가능 */}
      {row('아이디', user.loginId)}      {/* 수정 불가 (읽기 전용) */}
      {/* 수정(모드 진입) / 확인(저장) 버튼 */}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => { setEditing(true); setSaved(false); setProfileError(null) }} className="rounded border border-ink px-4 py-2 text-sm" disabled={loading}>수정</button>
        <button type="button" onClick={confirm} className="rounded bg-ink px-4 py-2 text-sm text-white" disabled={loading}>{loading ? '저장 중…' : '확인'}</button>
      </div>
      {profileError && <p role="alert" className="font-medium text-red-800">✕ {profileError}</p>}
      {saved && <p role="status" className="text-sm">✓ 반영되었습니다.</p>}

      {/* 비밀번호 변경 / 회원 탈퇴 */}
      <div className="flex flex-col gap-3 border-t border-rule pt-4">
        <button type="button" onClick={() => setPwOpen(true)} className="rounded border border-ink px-4 py-2 text-sm">비밀번호 변경</button>
        <button type="button" onClick={() => setQuitOpen(true)} className="rounded border border-red-700 px-4 py-2 text-sm text-red-800">회원 탈퇴</button>
      </div>

      <SessionNotice />

      {/* 비밀번호 변경 모달 */}
      {pwOpen && (
        <Modal title="비밀번호 변경" onClose={() => setPwOpen(false)}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              현재 비밀번호
              <input type="password" value={pwForm.current} autoComplete="current-password"
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required
                className="rounded border border-graphite bg-white px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              새 비밀번호
              <input type="password" value={pwForm.next} autoComplete="new-password"
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} required
                className="rounded border border-graphite bg-white px-3 py-2 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              새 비밀번호 확인
              <input type="password" value={pwForm.confirm} autoComplete="new-password"
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required
                className="rounded border border-graphite bg-white px-3 py-2 font-normal" />
            </label>
            {pwError && <p role="alert" className="font-medium text-red-800">✕ {pwError}</p>}
            {pwDone && <p role="status" className="text-sm">✓ 비밀번호가 변경되었습니다.</p>}
            <button type="button" onClick={submitPassword} disabled={loading}
              className="mt-2 rounded bg-ink px-4 py-2 text-sm text-white disabled:opacity-60">
              {loading ? '변경 중…' : '변경'}
            </button>
          </div>
        </Modal>
      )}

      {/* 회원 탈퇴 확인 모달 */}
      {quitOpen && (
        <Modal title="회원 탈퇴" onClose={() => setQuitOpen(false)}>
          <div className="flex flex-col gap-3">
            <p>정말 탈퇴하시겠습니까? 계정과 모든 분석 결과가 삭제되며 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setQuitOpen(false)} className="rounded border border-ink px-4 py-2 text-sm">취소</button>
              <button type="button" onClick={confirmQuit} disabled={loading}
                className="rounded bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-60">
                {loading ? '탈퇴 중…' : '탈퇴'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
