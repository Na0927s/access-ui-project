import { useEffect, useRef, type ReactNode } from 'react'

export default function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="modal-title" className="m-auto rounded-lg p-6 backdrop:bg-black/40">
      <h2 id="modal-title" className="mb-3 text-lg font-bold">{title}</h2>
      {children}
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={() => ref.current?.close()} className="rounded bg-ink px-4 py-2 text-white">확인</button>
      </div>
    </dialog>
  )
}
