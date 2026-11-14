// (한국어 요약) 개발자 모드 페이지 — 두 가지 입력 방식(탭)을 지원.
// 방식1: 화면 이미지 업로드 → 백엔드 이미지 분석 (mode='developer')
// 방식2: HTML/CSS 코드 입력 → 브라우저에서 색상 추출 → 백엔드 코드 분석
// 두 방식 모두 결과에 "문제 해결 방법" 카드와 "요약" 영역을 표시 (개발자 모드 전용 기능)
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyzeElements, analyzeImage } from '../api/client'
import type { CvdType, DeveloperAnalysis, ImageAnalysis, SolutionBox } from '../api/types'
import ColorChip from '../components/ColorChip'
import ContrastExample from '../components/ContrastExample'
import CvdSelector from '../components/CvdSelector'
import ImprovedCompare from '../components/ImprovedCompare'
import InfoPopover from '../components/InfoPopover'
import ResultCompare from '../components/ResultCompare'
import ResultSummary from '../components/ResultSummary'
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
  const [resultTab, setResultTab] = useState<'analysis' | 'compare'>('analysis') // 결과 화면 탭
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
        setResultTab('analysis') // 결과 탭을 첫 탭으로 초기화
        if (user)
          addResult({
            fileName: file.name,
            mode: 'developer-image',
            cvdType: cvd,
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
  // 이미지 결과의 우선 확인 색상 조합: 심각도(HIGH=FAIL) 우선 정렬 후 첫 조합.
  // 표시 순서만 변경하고 판정값·알고리즘은 변경하지 않음.
  const SEV_RANK = { HIGH: 2, MEDIUM: 1, LOW: 0 } as const
  const imagePriority =
    imageResult && imageResult.issues.length > 0
      ? [...imageResult.issues].sort(
          (a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity],
        )[0]
      : undefined

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('developer')}</h1>
        {/* 간단한 검사가 필요한 사용자를 사용자 모드로 안내 */}
        <Link
          to="/user"
          className="text-sm font-medium text-graphite underline underline-offset-4 hover:text-ink"
        >
          {t('switchToUser')} →
        </Link>
      </div>

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
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              method === m
                ? 'border-2 border-ink font-semibold bg-ink text-white'
                : 'border-rule bg-white hover:bg-paper'
            }`}
          >
            {m === 'image' ? t('method1') : t('method2')}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {/* 탭에 따라 입력 UI 교체: 드롭존 또는 코드 편집기 */}
        {method === 'image' ? (
          <UploadDropzone
            previewUrl={preview}
            onFile={(f) => {
              setFile(f)
              setPreview(URL.createObjectURL(f))
            }}
          />
        ) : (
          <div className="flex flex-1 flex-col gap-3 rounded-xl border border-rule bg-white p-4 shadow-sm">
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
                className="mt-1 w-full rounded-lg border border-rule bg-paper p-2 font-mono text-xs"
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
                className="mt-1 w-full rounded-lg border border-rule bg-paper p-2 font-mono text-xs"
              />
            </label>
            {/* 안내: 입력 코드는 실행되지 않음 (규칙 9번) */}
            <p className="text-xs text-graphite">{t('codeSafe')}</p>
          </div>
        )}
        {/* 컨트롤 바: 색약 유형 선택(가로) + 검사 버튼 */}
        <div className="flex flex-col gap-4 rounded-xl border border-rule bg-white p-5 shadow-sm">
          <CvdSelector value={cvd} onChange={setCvd} orientation="horizontal" />
          <button
            type="button"
            onClick={inspect}
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-xl bg-ink px-6 py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('inspecting') : t('inspect')}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-800">
          ✕ {error}
        </p>
      )}

      {/* [이미지 방식] 결과: 두 개 탭 — 검사 결과 및 대응 방안 / 대응 적용 이미지 비교 */}
      {imageResult && preview && (
        <div className="flex flex-col gap-6">
          {/* 대응 이미지가 있을 때만 비교 탭 노출 (추천이 없으면 두 번째 탭 숨김) */}
          {imageResult.improved_image && imageResult.improved_simulated_image ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">{t('resultContent')}</h2>
              <div role="tablist" aria-label={t('resultContent')} className="flex gap-2">
                {(
                  [
                    { key: 'analysis', label: t('tabAnalysis') },
                    { key: 'compare', label: t('tabCompare') },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    role="tab"
                    type="button"
                    aria-selected={resultTab === tab.key}
                    onClick={() => setResultTab(tab.key)}
                    className={`flex-1 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors ${
                      resultTab === tab.key
                        ? 'border-2 border-ink bg-ink text-white'
                        : 'border-rule bg-white text-graphite hover:bg-paper'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {/* 탭1: 검사 결과 및 대응 방안 — 원본/시뮬레이션 비교 + 결과 요약(추천 포함) */}
          {resultTab === 'analysis' && (
            <>
              <ResultCompare
                original={preview}
                simulated={imageResult.simulated_image}
                cvdType={imageResult.cvd_type}
              />
              <ResultSummary data={imageResult} mode="developer" />
            </>
          )}
          {/* 탭2: 대응 적용 이미지 비교 — Before/After 2×2 그리드 */}
          {resultTab === 'compare' &&
            imageResult.improved_image &&
            imageResult.improved_simulated_image && (
              <ImprovedCompare
                original={preview}
                simulated={imageResult.simulated_image}
                improved={imageResult.improved_image}
                improvedSimulated={imageResult.improved_simulated_image}
                cvdType={imageResult.cvd_type}
              />
            )}
        </div>
      )}

      {/* [코드 방식] 결과: 요소별 상세 테이블 (선택자/글자색/배경색/대비율/판정) */}
      {codeResult && (
        <section aria-labelledby="detail" className="rounded-lg border border-rule bg-white p-5">
          <h2 id="detail" className="mb-3 text-lg font-bold">
            {t('resultContent')}
            {/* 코드 모드 검사 방법·판정 의미 설명 (객관적 톤, 팝오버) */}
            <InfoPopover label={t('resultContent')}>
              <p className="mb-1 font-semibold">{t('popCodeMethodTitle')}</p>
              <p className="mb-2 text-graphite">{t('popCodeMethodBody')}</p>
              <p className="mb-1 font-semibold">{t('popCodeVerdictTitle')}</p>
              <p className="text-graphite">{t('popCodePassDesc')}</p>
              <p className="text-graphite">{t('popCodeWarnDesc')}</p>
              <p className="text-graphite">{t('popCodeFailDesc')}</p>
            </InfoPopover>
          </h2>
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium">
            <VerdictBadge verdict={codeResult.verdict} />
            <span>
              {t('resultLabel')}: {codeResult.result_message}
            </span>
          </p>
          {/* 대비율이 뭔지 실제 예시로 보여주는 안내 — 숫자가 익숙하지 않은 사용자용 (접기/펼침) */}
          <div className="mb-3">
            <ContrastExample />
          </div>
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
            className="self-center rounded-full border border-ink px-5 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white"
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
              {/* 이미지·코드 모드 모두에 ⓘ 표시 (추천 색상·아이콘 함께 사용 안내) */}
              {(imageResult || codeResult) && (
                <InfoPopover label={t('solutions')}>
                  <p className="mb-1 font-semibold">{t('popSolColorTitle')}</p>
                  <p className="mb-2 text-graphite">{t('popSolColorBody')}</p>
                  <p className="mb-1 font-semibold">{t('popSolIconTitle')}</p>
                  <p className="text-graphite">{t('popSolIconBody')}</p>
                </InfoPopover>
              )}
            </h2>
            <SolutionCards boxes={boxes} />
            {/* 요약: 코드 모드는 기존 통계 문구 유지, 이미지 모드는 동적 구조로 재구성 (점수는 표시하지 않음) */}
            <div className="rounded-xl border border-rule bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">{t('summaryTitle')}</h2>
              {codeResult ? (
                <>
                  <p className="text-sm">
                    {t('devSummary')
                      .replace('{total}', String(codeResult.summary.total))
                      .replace('{pass}', String(codeResult.summary.pass))
                      .replace('{warning}', String(codeResult.summary.warning))
                      .replace('{fail}', String(codeResult.summary.fail))}
                  </p>
                  {/* 코드 모드 우선 수정 대상: 첫 번째 해결 카드 (기존 동작 유지) */}
                  {boxes.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 text-sm">
                      <p>
                        {t('fixFirst')}
                        <code className="rounded bg-paper px-1.5 py-0.5">{boxes[0].selector}</code>
                      </p>
                      <p className="text-graphite">{t('fixFirstReason')}</p>
                    </div>
                  )}
                </>
              ) : (
                imageResult && (
                  <div className="flex flex-col gap-1.5 text-sm">
                    <p>
                      {t('sumIssues')}: {imageResult.issues.length}개
                    </p>
                    <p>
                      {t('sumColors')}: {imageResult.palette.length}개
                    </p>
                    {/* 우선 확인할 색상 조합: FAIL(HIGH) 우선 정렬 후 첫 조합. 문제 없으면 미표시. */}
                    {imagePriority && (
                      <p className="flex flex-wrap items-center gap-1.5">
                        {t('sumPriority')}:
                        {imagePriority.colors.map((c) => (
                          <ColorChip key={c} hex={c} />
                        ))}
                      </p>
                    )}
                    {/* 다음으로 할 일 안내. 문제가 없으면 별도 안내. */}
                    <p className="text-graphite">
                      {imageResult.issues.length > 0
                        ? `${t('sumNext')}: ${t('sumNextBody')}`
                        : t('sumOk')}
                    </p>
                  </div>
                )
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
