// (한국어 요약) 재사용 정보 팝오버 — 제목 옆 ⓘ 버튼.
// 데스크톱: 버튼 근처에 떠 있는 패널(화면 경계 자동 보정). 모바일: 인라인으로 펼침(잘림 방지).
// 접근성: aria-expanded/controls, Esc 닫기, 외부 클릭 닫기, 한 번에 하나만 열림.
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n/useT'

// 다른 팝오버가 열릴 때 기존 팝오버를 닫기 위한 공용 이벤트
const OPEN_EVENT = 'colorlens:infopopover-open'

export default function InfoPopover({
  label,
  children,
}: {
  label: string // 버튼의 aria-label (어떤 항목의 정보인지)
  children: ReactNode // 패널 내용 (구조화된 JSX)
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState(0) // 화면 우측 경계를 넘지 않도록 왼쪽으로 밀 양(px)
  const [narrow, setNarrow] = useState(false) // 모바일 여부 → 인라인 펼침
  const uid = useId()
  const panelId = `${uid}-panel`

  // 다른 팝오버가 열리면 닫기. 자신이 방금 발행한 이벤트에도 반응하지만
  // toggle()에서 직후 open=true로 덮어쓰므로 결과적으로 자신만 열린 상태가 됨.
  const handleOpenEvent = () => setOpen(false)

  // 외부 클릭·Esc로 닫기
  const handlePointer = (e: PointerEvent) => {
    const target = e.target as Node
    if (!btnRef.current?.contains(target) && !panelRef.current?.contains(target)) {
      setOpen(false)
    }
  }
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      btnRef.current?.focus()
    }
  }

  // 모바일 판별 (639px 이하 → 인라인 펼침으로 잘림 방지)
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // 열릴 때만 리스너 부착 + 패널 위치 보정
  useLayoutEffect(() => {
    if (!open) return
    window.addEventListener(OPEN_EVENT, handleOpenEvent)
    window.addEventListener('pointerdown', handlePointer)
    window.addEventListener('keydown', handleKey)
    // 패널이 화면 우측을 넘어가면 그만큼 왼쪽으로 이동
    const rect = panelRef.current?.getBoundingClientRect()
    if (rect) {
      const overflow = rect.right - (window.innerWidth - 12)
      setShift(overflow > 0 ? overflow : 0)
    }
    return () => {
      window.removeEventListener(OPEN_EVENT, handleOpenEvent)
      window.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, narrow])

  const toggle = () => {
    if (!open) window.dispatchEvent(new Event(OPEN_EVENT))
    setOpen((o) => !o)
  }

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label} ${t('infoLabel')}`}
        onClick={(e) => {
          // 부모 접기/펼치기 버튼까지 클릭이 전파되어 함께 토글되는 것을 방지
          e.stopPropagation()
          toggle()
        }}
        className="ml-1 inline-flex size-4.5 items-center justify-center rounded-full border border-graphite/60 text-[0.7rem] font-bold leading-none text-graphite transition-colors hover:border-ink hover:text-ink"
        style={{ width: '1.15rem', height: '1.15rem' }}
      >
        <span aria-hidden>i</span>
      </button>
      {/* 패널: 모바일은 static(인라인 펼침), 데스크톱은 absolute(떠 있음) */}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="region"
          aria-label={label}
          className={
            narrow
              ? 'static mt-2 w-full rounded-lg border border-rule bg-white p-4 text-sm shadow-sm'
              : 'absolute left-0 top-full z-50 mt-2 w-[min(22rem,90vw)] rounded-lg border border-rule bg-white p-4 text-sm shadow-lg'
          }
          style={narrow ? undefined : { transform: `translateX(-${shift}px)` }}
        >
          {children}
        </div>
      )}
    </span>
  )
}
