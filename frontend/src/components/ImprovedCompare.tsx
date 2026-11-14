// (한국어 요약) 대응 적용 이미지 비교 — Before/After 2×2 그리드.
// 행: 위=원본 계열, 아래=시뮬레이션 계열. 열: 왼=Before(원본), 오른=After(대응 적용).
// 핵심: 오른쪽 아래 이미지는 원본이 아닌 "대응 적용 이미지"에 시뮬레이션을 적용한 결과.
import type { CvdType } from '../api/types'
import { useT } from '../i18n/useT'

type Props = {
  original: string // 업로드 원본(미리보기 URL)
  simulated: string // 원본 시뮬레이션 (data URL)
  improved: string // 추천 색상 적용 이미지 (data URL)
  improvedSimulated: string // 대응 이미지 시뮬레이션 (data URL)
  cvdType: CvdType
}

// 2×2 비교 그리드. 모바일에서는 1열로 쌓아 가로 스크롤 방지.
export default function ImprovedCompare({
  original,
  simulated,
  improved,
  improvedSimulated,
  cvdType,
}: Props) {
  const t = useT()
  const cvdLabel = t(cvdType)
  return (
    <div className="flex flex-col gap-4">
      {/* 열 헤더: Before / After */}
      <div className="grid gap-4 md:grid-cols-2">
        <p className="text-sm font-bold text-graphite">{t('beforeLabel')}</p>
        <p className="text-sm font-bold text-graphite">{t('afterLabel')}</p>
      </div>
      {/* 2×2 그리드. md 이상에서 2열, 모바일은 1열 스택 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* (1,1) 원본 — Before 원본 */}
        <figure className="rounded-lg border border-rule bg-white p-3">
          <figcaption className="mb-2 text-sm font-semibold">{t('original')}</figcaption>
          <img src={original} alt={t('altOriginal')} className="w-full object-contain" />
        </figure>
        {/* (1,2) 대응 적용 이미지 — After 원본 계열 */}
        <figure className="rounded-lg border border-rule bg-white p-3">
          <figcaption className="mb-2 text-sm font-semibold">{t('improvedLabel')}</figcaption>
          <img src={improved} alt={t('altImproved')} className="w-full object-contain" />
        </figure>
        {/* (2,1) 원본 시뮬레이션 — Before 시뮬레이션 */}
        <figure className="rounded-lg border border-rule bg-white p-3">
          <figcaption className="mb-2 text-sm font-semibold">
            {t('originalSimLabel')} · {cvdLabel}
          </figcaption>
          <img
            src={simulated}
            alt={t('altSimulated').replace('{cvd}', cvdLabel)}
            className="w-full object-contain"
          />
        </figure>
        {/* (2,2) 대응 이미지 시뮬레이션 — After 시뮬레이션 (대응 이미지에 시뮬레이션 적용) */}
        <figure className="rounded-lg border-2 border-ink bg-white p-3">
          <figcaption className="mb-2 text-sm font-semibold">
            {t('improvedSimLabel')} · {cvdLabel}
          </figcaption>
          <img
            src={improvedSimulated}
            alt={t('altImprovedSim')}
            className="w-full object-contain"
          />
        </figure>
      </div>
      {/* 설명 캡션 — 오른쪽 아래가 대응 이미지 기준 시뮬레이션임을 명시 */}
      <p className="text-xs leading-relaxed text-graphite">{t('compareCaption')}</p>
    </div>
  )
}
