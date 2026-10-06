// (한국어 요약) 세션 안내 문구 — "계정과 결과는 저장되지 않는다"는 사실을 안내하는 배너
import { useT } from '../i18n/useT'

export default function SessionNotice() {
  const t = useT()
  return <p className="rounded border border-dashed border-graphite p-3 text-sm text-graphite">ⓘ {t('sessionNotice')}</p>
}
