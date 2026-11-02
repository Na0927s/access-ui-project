// (한국어 요약) 개발자 모드 페이지 — 두 가지 입력 방식(탭)을 지원.
// 방식1: 화면 이미지 업로드 → 백엔드 이미지 분석 (mode='developer')
// 방식2: HTML/CSS 코드 입력 → 브라우저에서 색상 추출 → 백엔드 코드 분석
// 두 방식 모두 결과에 "문제 해결 방법" 카드와 "요약" 영역을 표시 (개발자 모드 전용 기능)
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

type Method = 'image' | 'code' // 현재 선택된 입력 방식 (탭)

// 이미지 분석 결과를 문제 해결 카드(SolutionBox) 형태로 변환하는 어댑터 함수.
// 이슈 목록과 추천 색상 목록은 같은 순서로 생성되었으므로 인덱스(i)로 서로 짝지을 수 있음
function imageIssuesToBoxes(data: ImageAnalysis): SolutionBox[] {
  return data.issues.map((issue, i) => {
    const rec = data.recommendations?.[i]
    // 조건부(CONDITIONAL) 등급은 되도록 피하고, 없으면 첫 후보 사용
    const fix = rec
      ? (rec.candidates.find((c) => c.grade !== 'CONDITIONAL') ?? rec.candidates[0])
      : undefined
    return {
      selector: issue.colors.join(' / '), // 이미지 모드는 선택자가 없으므로 색상 쌍으로 표시
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
  const [method, setMethod] = useState<Method>('image') // 현재 탭 (이미지/코드)
  const [cvd, setCvd] = useState<CvdType | null>(null) // 선택한 색약 유형
  const [file, setFile] = useState<File | null>(null) // [이미지 방식] 업로드 파일
  const [preview, setPreview] = useState<string | null>(null) // [이미지 방식] 미리보기 URL
  const [html, setHtml] = useState('') // [코드 방식] HTML 입력값
  const [css, setCss] = useState('') // [코드 방식] CSS 입력값
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageResult, setImageResult] = useState<ImageAnalysis | null>(null) // 이미지 분석 결과
  const [codeResult, setCodeResult] = useState<DeveloperAnalysis | null>(null) // 코드 분석 결과
  const solutionsRef = useRef<HTMLElement>(null) // "문제 해결 방법 보기" 버튼의 스크롤 이동 대상
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.currentUser)
  const addResult = useResultStore((s) => s.add)

  // 미리보기 URL 메모리 해제
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  // 코드 파일(.html/.css)을 읽어 해당 textarea에 채워넣기
  const readCodeFile = async (f: File) => {
    const text = await f.text()
    if (f.name.endsWith('.css')) setCss(text)
    else setHtml(text)
  }

  // "검사" 버튼: 현재 탭에 따라 이미지 분석 또는 코드 분석 요청
  const inspect = async () => {
    if (!cvd) return setError(t('errNoCvd')) // 색약 유형은 두 방식 모두 필수
    setError(null)
    setLoading(true)
    try {
      if (method === 'image') {
        // --- 방식1: 이미지 분석 (개발자 모드로 요청 → 추천 색상 포함 응답) ---
        if (!file) throw new Error(t('errNoImage'))
        // 로그인 상태면 토큰 전달 → 백엔드가 결과를 DB에 저장 (규칙 1)
        const data = await analyzeImage(file, cvd, 'developer', lang, token)
        setImageResult(data)
        setCodeResult(null) // 반대쪽 탭의 이전 결과는 지움
        if (user)
          addResult({
            fileName: file.name,
            mode: 'developer-image',
            cvdType: cvd,
            score: data.score,
            data,
          })
      } else {
        // --- 방식2: 코드 분석 ---
        if (!html.trim()) throw new Error(t('errNoHtml'))
        const elements = await extractElements(html, css) // sandbox iframe에서 요소·색상 추출
        if (elements.length === 0) throw new Error(t('errNoElements'))
        // 로그인 상태면 토큰 전달 → 백엔드가 결과를 DB에 저장
        const data = await analyzeElements(elements, cvd, lang, token)
        setCodeResult(data)
        setImageResult(null)
        if (user)
          addResult({
            fileName: t('codeFileName'),
            mode: 'developer-code',
            cvdType: cvd,
            score: data.summary.score,
            data,
          })
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // 표시할 해결 카드: 코드 결과가 있으면 그것을, 아니면 이미지 결과를 카드로 변환
  const boxes = codeResult?.solution_boxes ?? (imageResult ? imageIssuesToBoxes(imageResult) : [])
  const hasResult = Boolean(codeResult || imageResult)

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{t('developer')}</h1>

      {/* 입력 방식 선택 탭 (role="tablist"/aria-selected로 탭임을 알림) */}
      <div role="tablist" aria-label={t('inputMethod')} className="flex gap-2">
        {(['image', 'code'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={method === m}
            onClick={() => {
              setMethod(m)
              // 탭 전환 시 이전 탭의 분석 결과를 지워 잔존 렌더링 방지
              setImageResult(null)
              setCodeResult(null)
            }}
            className={`rounded border px-4 py-2 text-sm ${method === m ? 'border-2 border-ink font-semibold' : 'border-rule'}`}
          >
            {method === m ? '✓ ' : ''}
            {m === 'image' ? t('method1') : t('method2')}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* 탭에 따라 좌측 입력 UI 교체: 드롭존 또는 코드 편집기 */}
        {method === 'image' ? (
          <UploadDropzone
            previewUrl={preview}
            onFile={(f) => {
              setFile(f)
              setPreview(URL.createObjectURL(f))
            }}
          />
        ) : (
          <div className="flex flex-1 flex-col gap-3">
            {/* 코드 파일 업로드: .html은 HTML 박스로, .css는 CSS 박스으로 자동 분류 */}
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
            {/* HTML 코드 입력 박스 */}
            <label className="text-sm font-semibold">
              HTML
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={8}
                autoFocus
                placeholder={t('htmlPlaceholder')}
                className="mt-1 w-full rounded border border-rule bg-white p-2 font-mono text-xs"
              />
            </label>
            {/* CSS 코드 입력 박스 (선택 사항) */}
            <label className="text-sm font-semibold">
              CSS
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                rows={6}
                placeholder={t('cssPlaceholder')}
                className="mt-1 w-full rounded border border-rule bg-white p-2 font-mono text-xs"
              />
            </label>
            {/* 안내: 입력 코드는 실행되지 않음 (규칙 9번) */}
            <p className="text-xs text-graphite">{t('codeSafe')}</p>
          </div>
        )}
        {/* 우측: 색약 유형 선택 + 검사 버튼 */}
        <div className="flex flex-col justify-between gap-4 md:w-40">
          <CvdSelector value={cvd} onChange={setCvd} />
          <button
            type="button"
            onClick={inspect}
            disabled={loading}
            aria-busy={loading}
            className="self-end rounded-lg bg-ink px-6 py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? t('inspecting') : t('inspect')}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="font-medium text-red-800">
          ✕ {error}
        </p>
      )}

      {/* [이미지 방식] 결과: 원본/시뮬레이션 비교 + 결과 요약(추천 포함) */}
      {imageResult && preview && (
        <div className="flex flex-col gap-6">
          <ResultCompare
            original={preview}
            simulated={imageResult.simulated_image}
            cvdType={imageResult.cvd_type}
          />
          <ResultSummary data={imageResult} mode="developer" />
        </div>
      )}

      {/* [코드 방식] 결과: 요소별 상세 테이블 (선택자/글자색/배경색/대비율/판정) */}
      {codeResult && (
        <section aria-labelledby="detail" className="rounded-lg border border-rule bg-white p-5">
          <h2 id="detail" className="mb-3 text-lg font-bold">
            {t('resultContent')}
          </h2>
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium">
            <VerdictBadge verdict={codeResult.verdict} />
            <span>
              {t('resultLabel')}: {codeResult.result_message}
            </span>
          </p>
          {/* overflow-x-auto: 테이블이 화면보다 넓으면 가로 스크롤로 처리 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="py-2">{t('selector')}</th>
                  <th>{t('textColor')}</th>
                  <th>{t('bgColor')}</th>
                  <th>{t('ratio')}</th>
                  <th>{t('verdictCol')}</th>
                </tr>
              </thead>
              <tbody>
                {codeResult.results.map((r, i) => (
                  <tr key={`${r.selector}-${i}`} className="border-b border-rule/60">
                    {/* 큰 텍스트 요소는 옆에 "(큰 텍스트)" 표시 — 적용 기준이 다르다는 뜻 */}
                    <td className="py-2">
                      <code>{r.selector}</code>
                      {r.is_large_text && (
                        <span className="ml-1 text-xs text-graphite">({t('largeText')})</span>
                      )}
                    </td>
                    <td>
                      <ColorChip hex={r.color} />
                    </td>
                    <td>
                      <ColorChip hex={r.background} />
                    </td>
                    <td className="tabular-nums">{r.ratio.toFixed(2)}:1</td>
                    <td>
                      <VerdictBadge verdict={r.verdict} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 두 방식 공통: 문제 해결 방법 + 요약 (개발자 모드 전용 영역) */}
      {hasResult && (
        <>
          {/* 눌러면 해결 방법 섹션으로 부드럽게 스크롤 이동 */}
          <button
            type="button"
            onClick={() => solutionsRef.current?.scrollIntoView()}
            className="self-center rounded border border-ink px-4 py-2 text-sm"
          >
            ↓ {t('goSolutions')}
          </button>
          {/* scroll-mt-4: 스크롤 이동 시 상단에 여백 확보 */}
          <section
            ref={solutionsRef}
            aria-labelledby="solutions"
            className="flex flex-col gap-6 scroll-mt-4"
          >
            <h2 id="solutions" className="text-lg font-bold">
              {t('solutions')}
            </h2>
            <SolutionCards boxes={boxes} />
            {/* 요약: 점수 + 통계 문구 */}
            <div className="rounded-lg border border-rule bg-white p-5">
              <h2 className="mb-3 text-lg font-bold">{t('summary')}</h2>
              {codeResult ? (
                <>
                  {/* 코드 분석 요약: 점수 + 전체/PASS/WARNING/FAIL 통계 */}
                  <ScoreBlock score={codeResult.summary.score} notice={codeResult.score_notice} />
                  <p className="mt-3 text-sm">
                    {t('devSummary')
                      .replace('{total}', String(codeResult.summary.total))
                      .replace('{pass}', String(codeResult.summary.pass))
                      .replace('{warning}', String(codeResult.summary.warning))
                      .replace('{fail}', String(codeResult.summary.fail))}
                  </p>
                </>
              ) : (
                imageResult && (
                  <>
                    {/* 이미지 분석 요약: 점수 + 문제 수/주요 색상 수 */}
                    <ScoreBlock score={imageResult.score} notice={imageResult.score_notice} />
                    <p className="mt-3 text-sm">
                      {t('imgSummary')
                        .replace('{issues}', String(imageResult.issues.length))
                        .replace('{colors}', String(imageResult.palette.length))}
                    </p>
                  </>
                )
              )}
              {/* 우선 수정 대상: 첫 번째 해결 카드의 대상 표시 */}
              {boxes.length > 0 && (
                <p className="mt-2 text-sm">
                  {t('fixFirst')}
                  <code>{boxes[0].selector}</code>
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
