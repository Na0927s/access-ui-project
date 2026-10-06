// (한국어 요약) 원본/시뮬레이션 결과 비교 뷰 — 두 이미지를 나란히 배치.
// 사용자 모드의 핵심 화면: "원본이 색약 사용자에게는 이렇게 보입니다"를 보여줌
import type { CvdType } from '../api/types'
import { useT } from '../i18n/useT'

export default function ResultCompare({ original, simulated, cvdType }: {
  original: string; simulated: string; cvdType: CvdType
}) {
  const t = useT()
  return (
    // 좌우 2단 그리드 (모바일에서는 세로로 쌓임)
    <div className="grid gap-4 md:grid-cols-2">
      {/* 왼쪽: 사용자가 업로드한 원본 이미지 */}
      <figure className="rounded-lg border border-rule bg-white p-3">
        <figcaption className="mb-2 text-sm font-semibold">{t('original')}</figcaption>
        <img src={original} alt={t('altOriginal')} className="w-full object-contain" />
      </figure>
      {/* 오른쪽: 색약 시뮬레이션 결과 이미지 (제목에 색약 유형 표시) */}
      <figure className="rounded-lg border border-rule bg-white p-3">
        <figcaption className="mb-2 text-sm font-semibold">{t('result')} · {t(cvdType)}</figcaption>
        {/* 대체 텍스트에도 어떤 유형인지 포함 (접근성) */}
        <img src={simulated} alt={t('altSimulated').replace('{cvd}', t(cvdType))} className="w-full object-contain" />
      </figure>
    </div>
  )
}
