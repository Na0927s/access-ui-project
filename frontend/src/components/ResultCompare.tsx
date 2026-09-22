import type { CvdType } from '../api/types'
import { useT } from '../i18n/useT'

export default function ResultCompare({ original, simulated, cvdType }: {
  original: string; simulated: string; cvdType: CvdType
}) {
  const t = useT()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <figure className="rounded-lg border border-rule bg-white p-3">
        <figcaption className="mb-2 text-sm font-semibold">{t('original')}</figcaption>
        <img src={original} alt="원본 화면" className="w-full object-contain" />
      </figure>
      <figure className="rounded-lg border border-rule bg-white p-3">
        <figcaption className="mb-2 text-sm font-semibold">{t('result')} · {t(cvdType)}</figcaption>
        <img src={simulated} alt={`${t(cvdType)} 계열 색각이상 시뮬레이션 화면`} className="w-full object-contain" />
      </figure>
    </div>
  )
}
