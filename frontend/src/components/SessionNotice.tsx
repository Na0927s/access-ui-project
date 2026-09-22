import { useT } from '../i18n/useT'

export default function SessionNotice() {
  const t = useT()
  return <p className="rounded border border-dashed border-graphite p-3 text-sm text-graphite">ⓘ {t('sessionNotice')}</p>
}
