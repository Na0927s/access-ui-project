import { useState } from 'react'
import type { SolutionBox } from '../api/types'
import { useT } from '../i18n/useT'

export default function SolutionCards({ boxes }: { boxes: SolutionBox[] }) {
  const t = useT()
  const [copied, setCopied] = useState<number | null>(null)
  const CHECK_LABEL = {
    CONTRAST: t('checkContrast'),
    LIGHTNESS: t('checkLightness'),
    COLOR_ONLY: t('checkColorOnly'),
  } as const

  if (boxes.length === 0) return <p className="text-sm">✓ {t('noFixNeeded')}</p>

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {boxes.map((b, i) => (
        <li key={`${b.selector}-${i}`} className="flex flex-col gap-2 rounded-lg border border-rule bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-semibold">{b.selector}</code>
            <span className="rounded border border-ink px-2 py-0.5 text-xs">{CHECK_LABEL[b.check_type]}</span>
          </div>
          <p className="text-sm">{b.problem}</p>
          {b.css_fix && (
            <div className="flex items-start gap-2">
              <pre className="flex-1 overflow-x-auto rounded bg-paper p-2 text-xs">{b.css_fix}</pre>
              <button
                type="button"
                className="rounded border border-ink px-2 py-1 text-xs"
                onClick={() => navigator.clipboard.writeText(b.css_fix!).then(() => setCopied(i))}
              >
                {copied === i ? `✓ ${t('copied')}` : t('copy')}
              </button>
            </div>
          )}
          {b.non_color_fix && <p className="text-sm text-graphite">{b.non_color_fix}</p>}
        </li>
      ))}
    </ul>
  )
}
