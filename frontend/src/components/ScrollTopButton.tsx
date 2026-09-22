import { useT } from '../i18n/useT'

export default function ScrollTopButton() {
  const t = useT()
  return (
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
