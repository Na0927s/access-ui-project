// (한국어 요약) 마이페이지 > 내 정보 — 로그인한 사용자의 이름/이메일을 조회·수정하는 화면.
// (RequireLogin으로 보호되어 currentUser가 항상 존재함 — ! 단언 사용)
import { useState } from 'react'
import SessionNotice from '../components/SessionNotice'
import { useAuthStore } from '../stores/authStore'

export default function MyInfoPage() {
  const user = useAuthStore((s) => s.currentUser)!
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [editing, setEditing] = useState(false)   // 수정 모드 여부
  const [name, setName] = useState(user.name)      // 편집 중인 이름
  const [email, setEmail] = useState(user.email)   // 편집 중인 이메일
  const [saved, setSaved] = useState(false)        // 저장 완료 표시

  // 확인 버튼: 수정 모드였다면 입력값을 스토어에 반영하고 수정 모드 종료
  const confirm = () => {
    if (editing) updateProfile({ name, email })
    setEditing(false)
    setSaved(true)
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
        <button type="button" onClick={() => { setEditing(true); setSaved(false) }} className="rounded border border-ink px-4 py-2 text-sm">수정</button>
        <button type="button" onClick={confirm} className="rounded bg-ink px-4 py-2 text-sm text-white">확인</button>
      </div>
      {saved && <p role="status" className="text-sm">✓ 반영되었습니다.</p>}
      <SessionNotice />
    </div>
  )
}
