// (한국어 요약) "맨 위로" 스크롤 버튼 — 화면 우측 하단에 고정 표시
import { useT } from '../i18n/useT'

export default function ScrollTopButton() {
  const t = useT()
  return (
    // aria-label·title: 아이콘만 있는 버튼의 용도를 스크린리더와 마우스 호버에 알려줌
    <button
      type="button"
      aria-label={t('toTop')}
      title={t('toTop')}
      onClick={() => window.scrollTo({ top: 0 })}
      className="fixed right-5 bottom-5 grid size-12 place-items-center rounded-full border-2 border-ink bg-white text-xl shadow"
    >
      <span aria-hidden>↑</span>
    </button>
  )
}
