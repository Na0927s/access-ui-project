// (한국어 요약) 색약 유형 선택 컴포넌트 — 적색/녹색/청색 라디오 버튼 그룹.
// 규칙 8번(자체 접근성): 선택 상태를 색이 아닌 테두리 두께·굵기·✓ 표시로도 구분
import type { CvdType } from '../api/types'
import { useT } from '../i18n/useT'

const TYPES: CvdType[] = ['protan', 'deutan', 'tritan']

export default function CvdSelector({ value, onChange }: { value: CvdType | null; onChange: (v: CvdType) => void }) {
  const t = useT()
  return (
    // fieldset+legend: 라디오 그룹에 "색약 유형"이라는 이름을 붙여 스크린리더가 그룹으로 인식
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{t('cvdLabel')}</legend>
      {TYPES.map((type) => {
        const selected = value === type
        return (
          // label로 감싸 텍스트를 클릭해도 선택되게 함. 선택됨 = 굵은 테두리 2px + 굵은 글씨
          <label
            key={type}
            className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
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
            <span aria-hidden className="w-4">{selected ? '✓' : ''}</span>
            {t(type)}
          </label>
        )
      })}
    </fieldset>
  )
}
