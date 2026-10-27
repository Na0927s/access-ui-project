// (한국어 요약) 모달(팝업) 컴포넌트 — 네이티브 <dialog> 요소를 사용.
// 네이티브 dialog는 ESC 닫기, 포커스 트랩(모달 밖으로 포커스 이동 방지)을 브라우저가 자동 처리
import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '../i18n/useT'

export default function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const t = useT()
  const ref = useRef<HTMLDialogElement>(null)
  // 마운트되자마자 모달을 열고, 닫히면(onClose 이벤트) 부모가 넘긴 onClose 콜백 실행
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    // backdrop:bg-black/40: 배경을 반투명하게 깔아주는 스타일
    <dialog ref={ref} onClose={onClose} aria-labelledby="modal-title" className="m-auto rounded-lg p-6 backdrop:bg-black/40">
      <h2 id="modal-title" className="mb-3 text-lg font-bold">{title}</h2>
      {children}
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={() => ref.current?.close()} className="rounded bg-ink px-4 py-2 text-white">{t('modalOk')}</button>
      </div>
    </dialog>
  )
}
