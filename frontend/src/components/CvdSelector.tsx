// (한국어 요약) 색약 유형 선택 컴포넌트 — 적색/녹색/청색 라디오 버튼 그룹.
// 규칙 8번(자체 접근성): 선택 상태를 색이 아닌 테두리 두께·굵기·✓ 표시로도 구분.
// 선택한 유형 아래에 "이 색각이상이란?" 설명이 펼쳐져 일반 사용자도 이해할 수 있도록 함.
import type { CvdType } from '../api/types'
import { useT } from '../i18n/useT'

const TYPES: CvdType[] = ['protan', 'deutan', 'tritan']

export default function CvdSelector({
  value,
  onChange,
  orientation = 'vertical',
}: {
  value: CvdType | null
  onChange: (v: CvdType) => void
  orientation?: 'vertical' | 'horizontal'
}) {
  const t = useT()
  const horizontal = orientation === 'horizontal'
  // 색각이상 유형별 쉬운 설명 (선택 시 아래에 표시)
  const DESC: Record<CvdType, string> = {
    protan: t('protanDesc'),
    deutan: t('deutanDesc'),
    tritan: t('tritanDesc'),
  }

  return (
    // fieldset+legend: 라디오 그룹에 "색약 유형"이라는 이름을 붙여 스크린리더가 그룹으로 인식
    <div className="flex flex-col gap-2">
      <fieldset className={`flex gap-2 ${horizontal ? 'flex-row flex-wrap' : 'flex-col'}`}>
        <legend className="mb-1 text-sm font-semibold">{t('cvdLabel')}</legend>
        {TYPES.map((type) => {
          const selected = value === type
          return (
            // label로 감싸 텍스트를 클릭해도 선택되게 함. 선택됨 = 굵은 테두리 2px + 굵은 글씨
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-paper ${
                selected ? 'border-2 border-ink font-semibold' : 'border-rule'
              }`}
            >
              {/* 라디오 자체는 화면에서 숨기고(sr-only) ✓ 표시와 텍스트로 상태를 보여줌 */}
              <input
                type="radio"
                name="cvd"
                value={type}
                checked={selected}
                onChange={() => onChange(type)}
                className="sr-only"
              />
              <span aria-hidden className="w-4">
                {selected ? '✓' : ''}
              </span>
              {t(type)}
            </label>
          )
        })}
      </fieldset>
      {/* 선택한 색각이상이 무엇인지 쉽게 설명 (선택 전엔 안 내용 없음) */}
      {value && (
        <div className="rounded-lg bg-paper p-3 text-xs leading-relaxed text-graphite">
          <p className="mb-0.5 font-semibold text-ink">{t('cvdInfoTitle')}</p>
          <p>{DESC[value]}</p>
        </div>
      )}
    </div>
  )
}
