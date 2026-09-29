import { useEffect, useRef, useState } from 'react'
import { analyzeElements, analyzeImage } from '../api/client'
import type { CvdType, DeveloperAnalysis, ImageAnalysis, SolutionBox } from '../api/types'
import ColorChip from '../components/ColorChip'
import CvdSelector from '../components/CvdSelector'
import ResultCompare from '../components/ResultCompare'
import ResultSummary from '../components/ResultSummary'
import ScoreBlock from '../components/ScoreBlock'
import SolutionCards from '../components/SolutionCards'
import UploadDropzone from '../components/UploadDropzone'
import VerdictBadge from '../components/VerdictBadge'
import { useT } from '../i18n/useT'
import { useAuthStore } from '../stores/authStore'
import { useResultStore } from '../stores/resultStore'
import { useUiStore } from '../stores/uiStore'
import { extractElements } from '../utils/extractElements'

type Method = 'image' | 'code'

function imageIssuesToBoxes(data: ImageAnalysis): SolutionBox[] {
  return data.issues.map((issue, i) => {
    const rec = data.recommendations?.[i]
    const fix = rec ? rec.candidates.find((c) => c.grade !== 'CONDITIONAL') ?? rec.candidates[0] : undefined
    return {
      selector: issue.colors.join(' / '),
      check_type: issue.type === 'LOW_CONTRAST' ? 'CONTRAST' : 'COLOR_ONLY',
      problem: issue.message,
      css_fix: rec && fix ? `/* ${rec.current} → */ color: ${fix.hex};` : null,
      non_color_fix: rec ? rec.non_color_tips[0] : null,
    }
  })
}

export default function DeveloperModePage() {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const [method, setMethod] = useState<Method>('image')
  const [cvd, setCvd] = useState<CvdType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [html, setHtml] = useState('')
  const [css, setCss] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageResult, setImageResult] = useState<ImageAnalysis | null>(null)
  const [codeResult, setCodeResult] = useState<DeveloperAnalysis | null>(null)
  const solutionsRef = useRef<HTMLElement>(null)
  const user = useAuthStore((s) => s.currentUser)
  const addResult = useResultStore((s) => s.add)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const readCodeFile = async (f: File) => {
    const text = await f.text()
    if (f.name.endsWith('.css')) setCss(text)
    else setHtml(text)
  }

  const inspect = async () => {
    if (!cvd) return setError(t('errNoCvd'))
    setError(null)
    setLoading(true)
    try {
      if (method === 'image') {
        if (!file) throw new Error(t('errNoImage'))
        const data = await analyzeImage(file, cvd, 'developer', lang)
        setImageResult(data)
        setCodeResult(null)
        if (user) addResult({ fileName: file.name, mode: 'developer-image', cvdType: cvd, score: data.score, data })
      } else {
        if (!html.trim()) throw new Error(t('errNoHtml'))
        const elements = await extractElements(html, css)
        if (elements.length === 0) throw new Error(t('errNoElements'))
        const data = await analyzeElements(elements, cvd, lang)
        setCodeResult(data)
        setImageResult(null)
        if (user) addResult({ fileName: 'HTML/CSS 코드', mode: 'developer-code', cvdType: cvd, score: data.summary.score, data })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const boxes = codeResult?.solution_boxes ?? (imageResult ? imageIssuesToBoxes(imageResult) : [])
  const hasResult = Boolean(codeResult || imageResult)

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{t('developer')}</h1>

      <div role="tablist" aria-label={t('inputMethod')} className="flex gap-2">
        {(['image', 'code'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            className={`rounded border px-4 py-2 text-sm ${method === m ? 'border-2 border-ink font-semibold' : 'border-rule'}`}
          >
            {method === m ? '✓ ' : ''}{m === 'image' ? t('method1') : t('method2')}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {method === 'image' ? (
          <UploadDropzone previewUrl={preview} onFile={(f) => { setFile(f); setPreview(URL.createObjectURL(f)) }} />
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            <label className="text-sm font-semibold">
              {t('codeFile')}
              <input
                type="file"
                accept=".html,.htm,.css,text/html,text/css"
                multiple
                className="mt-1 block text-sm"
                onChange={(e) => Array.from(e.target.files ?? []).forEach(readCodeFile)}
              />
            </label>
            <label className="text-sm font-semibold">
              HTML
              <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={8} autoFocus
                placeholder={t('htmlPlaceholder')}
                className="mt-1 w-full rounded border border-rule bg-white p-2 font-mono text-xs" />
            </label>
            <label className="text-sm font-semibold">
              CSS
              <textarea value={css} onChange={(e) => setCss(e.target.value)} rows={6}
                placeholder={t('cssPlaceholder')}
                className="mt-1 w-full rounded border border-rule bg-white p-2 font-mono text-xs" />
            </label>
            <p className="text-xs text-graphite">{t('codeSafe')}</p>
          </div>
        )}
        <div className="flex flex-col justify-between gap-4 md:w-40">
          <CvdSelector value={cvd} onChange={setCvd} />
          <button type="button" onClick={inspect} disabled={loading} aria-busy={loading}
            className="grid size-20 place-items-center self-end rounded-full bg-ink font-bold text-white">
            {loading ? t('inspecting') : t('inspect')}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="font-medium text-red-800">✕ {error}</p>}

      {imageResult && preview && (
        <div className="flex flex-col gap-6">
          <ResultCompare original={preview} simulated={imageResult.simulated_image} cvdType={imageResult.cvd_type} />
          <ResultSummary data={imageResult} mode="developer" />
        </div>
      )}

      {codeResult && (
        <section aria-labelledby="detail" className="rounded-lg border border-rule bg-white p-5">
          <h2 id="detail" className="mb-3 text-lg font-bold">{t('resultContent')}</h2>
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium">
            <VerdictBadge verdict={codeResult.verdict} />
            <span>{t('resultLabel')}: {codeResult.result_message}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="py-2">{t('selector')}</th><th>{t('textColor')}</th><th>{t('bgColor')}</th><th>{t('ratio')}</th><th>{t('verdictCol')}</th>
                </tr>
              </thead>
              <tbody>
                {codeResult.results.map((r, i) => (
                  <tr key={`${r.selector}-${i}`} className="border-b border-rule/60">
                    <td className="py-2"><code>{r.selector}</code>{r.is_large_text && <span className="ml-1 text-xs text-graphite">({t('largeText')})</span>}</td>
                    <td><ColorChip hex={r.color} /></td>
                    <td><ColorChip hex={r.background} /></td>
                    <td className="tabular-nums">{r.ratio.toFixed(2)}:1</td>
                    <td><VerdictBadge verdict={r.verdict} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hasResult && (
        <>
          <button type="button" onClick={() => solutionsRef.current?.scrollIntoView()}
            className="self-center rounded border border-ink px-4 py-2 text-sm">
            ↓ {t('goSolutions')}
          </button>
          <section ref={solutionsRef} aria-labelledby="solutions" className="flex flex-col gap-6 scroll-mt-4">
            <h2 id="solutions" className="text-lg font-bold">{t('solutions')}</h2>
            <SolutionCards boxes={boxes} />
            <div className="rounded-lg border border-rule bg-white p-5">
              <h2 className="mb-3 text-lg font-bold">{t('summary')}</h2>
              {codeResult ? (
                <>
                  <ScoreBlock score={codeResult.summary.score} notice={codeResult.score_notice} />
                  <p className="mt-3 text-sm">
                    {t('devSummary')
                      .replace('{total}', String(codeResult.summary.total))
                      .replace('{pass}', String(codeResult.summary.pass))
                      .replace('{warning}', String(codeResult.summary.warning))
                      .replace('{fail}', String(codeResult.summary.fail))}
                  </p>
                </>
              ) : imageResult && (
                <>
                  <ScoreBlock score={imageResult.score} notice={imageResult.score_notice} />
                  <p className="mt-3 text-sm">
                    {t('imgSummary')
                      .replace('{issues}', String(imageResult.issues.length))
                      .replace('{colors}', String(imageResult.palette.length))}
                  </p>
                </>
              )}
              {boxes.length > 0 && <p className="mt-2 text-sm">{t('fixFirst')}<code>{boxes[0].selector}</code></p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
