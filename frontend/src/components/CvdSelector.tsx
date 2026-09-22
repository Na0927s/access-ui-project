import type { CvdType } from '../api/types'
import { useT } from '../i18n/useT'

const TYPES: CvdType[] = ['protan', 'deutan', 'tritan']

export default function CvdSelector({ value, onChange }: { value: CvdType | null; onChange: (v: CvdType) => void }) {
  const t = useT()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{t('cvdLabel')}</legend>
      {TYPES.map((type) => {
        const selected = value === type
        return (
          <label
            key={type}
            className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
              selected ? 'border-2 border-ink font-semibold' : 'border-rule'
            }`}
          >
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
