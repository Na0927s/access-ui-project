import { useState } from 'react'
import SessionNotice from '../components/SessionNotice'
import { useAuthStore } from '../stores/authStore'

export default function MyInfoPage() {
  const user = useAuthStore((s) => s.currentUser)!
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [saved, setSaved] = useState(false)

  const confirm = () => {
    if (editing) updateProfile({ name, email })
    setEditing(false)
    setSaved(true)
  }

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
      <div aria-hidden className="mx-auto grid size-28 place-items-center rounded-full border-2 border-ink text-4xl">
        {user.name.slice(0, 1)}
      </div>
      {row('이름', name, setName)}
      {row('이메일', email, setEmail)}
      {row('아이디', user.loginId)}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => { setEditing(true); setSaved(false) }} className="rounded border border-ink px-4 py-2 text-sm">수정</button>
        <button type="button" onClick={confirm} className="rounded bg-ink px-4 py-2 text-sm text-white">확인</button>
      </div>
      {saved && <p role="status" className="text-sm">✓ 반영되었습니다.</p>}
      <SessionNotice />
    </div>
  )
}
