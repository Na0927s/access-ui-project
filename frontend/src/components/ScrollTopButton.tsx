// (한국어 요약) "맨 위로" 스크롤 버튼 — 화면 우측 하단에 고정 표시.
// 스크롤을 일정 이상 내렸을 때만 나타나고, 최상단에서는 숨김.
import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'

// 버튼이 나타나는 스크롤 임계값 (px). 이 값 이상 내려야 버튼 표시.
const SHOW_AFTER = 400

export default function ScrollTopButton() {
  const t = useT()
  const [visible, setVisible] = useState(false)

  // 스크롤 위치에 따라 버튼 표시 여부 갱신
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER)
    onScroll() // 마운트 시 현재 위치 반영
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label={t('toTop')}
      title={t('toTop')}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed right-5 bottom-5 grid size-12 place-items-center rounded-full border-2 border-ink bg-white text-xl shadow transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <span aria-hidden>↑</span>
    </button>
  )
}
