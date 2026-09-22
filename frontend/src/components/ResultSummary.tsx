import { useEffect, useState } from 'react'
import { explain, type Explanation } from '../api/client'
import type { ImageAnalysis } from '../api/types'
import { useT, useTranslated } from '../i18n/useT'
import { useUiStore } from '../stores/uiStore'
import ColorChip from './ColorChip'
import ScoreBlock from './ScoreBlock'
import VerdictBadge from './VerdictBadge'

const GRADE_LABEL = { STRONG: '✓ 강력 추천', RECOMMENDED: '✓ 추천', CONDITIONAL: '△ 조건부 추천' } as const

export default function ResultSummary({ data, mode }: { data: ImageAnalysis; mode: 'user' | 'developer' }) {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const [ai, setAi] = useState<Explanation | null>(null)

  useEffect(() => {
    let alive = true
    explain(data, lang, mode).then((r) => alive && setAi(r)).catch(() => alive && setAi(null))
    return () => { alive = false }
  }, [data, lang, mode])

  const messages = useTranslated(data.issues.map((i) => i.message))

  return (
    <section aria-labelledby="result-content" className="flex flex-col gap-6 rounded-lg border border-rule bg-white p-5">
      <h2 id="result-content" className="text-lg font-bold">{t('resultContent')}</h2>
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <VerdictBadge verdict={data.verdict} />
        <span>{t('resultLabel')}: {data.result_message}</span>
      </p>
      <ScoreBlock score={data.score} notice={data.score_notice} />

      {ai && (
        <div className="rounded border border-rule p-3 text-sm">
          <p className="mb-1 text-xs text-graphite">{ai.source === 'ai' ? 'AI 설명' : '요약 설명'}</p>
          <p>{ai.summary}</p>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold">{t('palette')}</h3>
        <ul className="flex flex-wrap gap-3">
          {data.palette.map((c) => (
            <li key={c.hex}><ColorChip hex={c.hex} /> <span className="text-sm text-graphite">{(c.ratio * 100).toFixed(1)}%</span></li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">{t('issues')}</h3>
        {data.issues.length === 0 ? (
          <p className="text-sm">✓ {t('noIssues')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.issues.map((issue, i) => (
              <li key={issue.id} className="flex flex-wrap items-center gap-2 text-sm">
                <VerdictBadge verdict={issue.severity === 'HIGH' ? 'FAIL' : 'WARNING'} />
                {issue.colors.map((c) => <ColorChip key={c} hex={c} />)}
                <span>{messages[i] ?? issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mode === 'developer' && data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{t('recommend')}</h3>
          <ul className="flex flex-col gap-3">
            {data.recommendations.map((r, i) => (
              <li key={`${r.current}-${r.against}-${i}`} className="text-sm">
                <p><ColorChip hex={r.current} label={t('current')} /> <span className="text-graphite">vs {r.against}</span></p>
                {r.candidates.length > 0 ? (
                  <ul className="mt-1 ml-4 flex flex-col gap-1">
                    {r.candidates.map((c) => (
                      <li key={c.hex} className="flex flex-wrap items-center gap-2">
                        <span aria-hidden>→</span><ColorChip hex={c.hex} />
                        <span className="tabular-nums">{c.ratio.toFixed(2)}:1</span>
                        <strong>{GRADE_LABEL[c.grade]}</strong>
                        <span className="text-graphite">{c.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 ml-4 text-graphite">색 변경만으로는 기준을 만족하기 어렵습니다. {r.non_color_tips[0]}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
