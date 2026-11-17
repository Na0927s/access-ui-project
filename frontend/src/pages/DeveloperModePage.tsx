// (한국어 요약) 개발자 모드 페이지 — 두 가지 입력 방식(탭)을 지원.
// 방식1: 화면 이미지 업로드 → 백엔드 이미지 분석 (mode='developer')
// 방식2: HTML/CSS 코드 입력 → 브라우저에서 색상 추출 → 백엔드 코드 분석
// 두 방식 모두 결과에 "문제 해결 방법" 카드와 "요약" 영역을 표시 (개발자 모드 전용 기능)
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { analyzeElements, analyzeImage } from '../api/client'
import type { CvdType, DeveloperAnalysis, ImageAnalysis } from '../api/types'
import CodeResultTable from '../components/CodeResultTable'
import ColorChip from '../components/ColorChip'
import CvdSelector from '../components/CvdSelector'
import InfoPopover from '../components/InfoPopover'
import ResultCompare from '../components/ResultCompare'
import ResultSummary from '../components/ResultSummary'
import SolutionCards from '../components/SolutionCards'
import UploadDropzone from '../components/UploadDropzone'
import VerdictBadge from '../components/VerdictBadge'
import { useRovingTabs } from '../hooks/useRovingTabs'
import { useT } from '../i18n/useT'
import { useAuthStore } from '../stores/authStore'
import { useResultStore } from '../stores/resultStore'
import { useUiStore } from '../stores/uiStore'
import { extractElements } from '../utils/extractElements'
import { imageIssuesToBoxes } from '../utils/imageIssuesToBoxes'

type Method = 'image' | 'code' // 현재 선택된 입력 방식 (탭)
// 탭 목록 상수 — useRovingTabs에 안정적 참조로 전달하기 위해 컴포넌트 밖에 선언.
const METHODS: readonly Method[] = ['image', 'code']

export default function DeveloperModePage() {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  // 진입 쿼리 ?method=code 가 있으면 코드 탭부터 시작 (메인 "개발자 · 코드로 검사" 버튼 진입점).
  // 기본은 이미지 탭. 진입 시 한 번만 반영(lazy initializer).
  const [searchParams] = useSearchParams()
  const [method, setMethod] = useState<Method>(
    () => (searchParams.get('method') === 'code' ? 'code' : 'image'),
  )
  const [cvd, setCvd] = useState<CvdType | null>(null) // 선택한 색약 유형
  const [file, setFile] = useState<File | null>(null) // [이미지 방식] 업로드 파일
  const [preview, setPreview] = useState<string | null>(null) // [이미지 방식] 미리보기 URL
  const [html, setHtml] = useState('') // [코드 방식] HTML 입력값
  const [css, setCss] = useState('') // [코드 방식] CSS 입력값
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageResult, setImageResult] = useState<ImageAnalysis | null>(null) // 이미지 분석 결과
  const [codeResult, setCodeResult] = useState<DeveloperAnalysis | null>(null) // 코드 분석 결과
  const [solutionsOpen, setSolutionsOpen] = useState(false) // 문제 해결 방법 영역 펼침 여부
  // 코드 모드 결과 내용(표) 펼침 여부.
  // 첫 검사 직후 펼친 상태로 보이도록 기본 true (문제 해결 방법은 접힘).
  const [codeDetailOpen, setCodeDetailOpen] = useState(true)
  // 이미지 분석 회차 — ResultSummary의 key로 사용해 새 검사마다 remount → 펼침 상태 초기화 (A3).
  const [inspectSeq, setInspectSeq] = useState(0)
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.currentUser)
  const addResult = useResultStore((s) => s.add)

  // 입력 방식 탭 — WAI-ARIA Tabs 패턴 (roving tabindex + 화살표 키 + tabpanel).
  const inputUid = useId()
  const inputPanelId = `${inputUid}-input-panel`
  const inputTabId = (m: Method) => `${inputUid}-input-tab-${m}`
  // 탭 전환 시 이전 탭의 분석 결과도 함께 지움 (안정 콜백).
  const selectMethod = useCallback((m: Method) => {
    setMethod(m)
    setImageResult(null)
    setCodeResult(null)
  }, [])
  const inputTabs = useRovingTabs<Method>(METHODS, method, selectMethod)

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

  // "검사" 버튼: 현재 탭에 따라 이미지 분석 또는 코드 분석 요청.
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
        setSolutionsOpen(false) // 접기 상태도 새 결과에 맞춰 초기화 (A1)
        setCodeDetailOpen(true) // 결과 내용은 펼침, 문제 해결 방법은 접힘
        setInspectSeq((n) => n + 1) // 회차 증가 → ResultSummary remount (A3)
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
        setSolutionsOpen(false) // 접기 상태도 새 결과에 맞춰 초기화 (A1)
        setCodeDetailOpen(true) // 결과 내용은 펼침, 문제 해결 방법은 접힘
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

  // 언어 전환 시 자동 재분석 (방안 A) — 직전 검사 입력을 ref로 보관 후 lang 변경 시 재요청.
  // 결과만 갱신하고 탭 전환·접기 초기화·내역 중복 적재는 생략 (같은 검사의 다른 언어 버전).
  // ref 갱신은 effect 안에서 수행해 렌더 중 ref 쓰기(react-hooks/refs)를 피함.
  const lastInputsRef = useRef<
    | { method: 'image'; file: File; cvd: CvdType }
    | { method: 'code'; html: string; css: string; cvd: CvdType }
    | null
  >(null)
  useEffect(() => {
    if ((imageResult || codeResult) && cvd) {
      lastInputsRef.current =
        method === 'image' && file
          ? { method: 'image', file, cvd }
          : method === 'code' && html.trim()
            ? { method: 'code', html, css, cvd }
            : null
    } else {
      lastInputsRef.current = null
    }
  }, [imageResult, codeResult, method, file, html, css, cvd])
  useEffect(() => {
    const inputs = lastInputsRef.current
    if (!inputs) return // 아직 검사한 적 없으면 재분석하지 않음
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        if (inputs.method === 'image') {
          const data = await analyzeImage(inputs.file, inputs.cvd, 'developer', lang, token)
          if (!cancelled) setImageResult(data)
        } else {
          const elements = await extractElements(inputs.html, inputs.css)
          if (elements.length === 0) throw new Error(t('errNoElements'))
          const data = await analyzeElements(elements, inputs.cvd, lang, token)
          if (!cancelled) setCodeResult(data)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // t는 매 렌더마다 새 함수이므로 의존성에서 제외 (lang 변경으로만 재실행).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, token])

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

      {/* 입력 방식 선택 탭 — WAI-ARIA Tabs (roving tabindex + 화살표 키). */}
      <div role="tablist" aria-label={t('inputMethod')} className="flex gap-2">
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            {...inputTabs.getTabButtonProps(m, inputTabId(m), inputPanelId)}
            onClick={() => selectMethod(m)}
            className={`rounded-lg border-2 px-4 py-2 text-sm transition-colors ${
              method === m
                ? 'border-ink font-semibold bg-ink text-white'
                : 'border-rule bg-white hover:bg-paper'
            }`}
          >
            {m === 'image' ? t('method1') : t('method2')}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {/* tabpanel: 활성 탭의 입력 UI. aria-labelledby로 탭과 연결. */}
        <div
          role="tabpanel"
          id={inputPanelId}
          aria-labelledby={inputTabId(method)}
          tabIndex={0}
        >
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
        </div>
        {/* 컨트롤 바: 색약 유형 선택(가로) + 검사 버튼 */}
        <div className="flex flex-col gap-4 rounded-xl border border-rule bg-white p-5 shadow-sm">
          <CvdSelector value={cvd} onChange={setCvd} orientation="horizontal" />
          <button
            type="button"
            onClick={inspect}
            disabled={loading}
            aria-busy={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {loading ? t('inspecting') : t('inspect')}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-800">
          ✕ {error}
        </p>
      )}

      {/* [이미지 방식] 결과: 원본/시뮬레이션 비교 + 상세(주요 색상/문제/추천).
          aria-live로 스크린리더에게 결과가 표시되었음을 알림. */}
      {imageResult && preview && (
        <div className="flex flex-col gap-6" aria-live="polite">
          <h2 className="text-lg font-bold">{t('resultContent')}</h2>
          <ResultCompare
            original={preview}
            simulated={imageResult.simulated_image}
            cvdType={imageResult.cvd_type}
          />
          {/* collapsible: 상세 영역(주요 색상/문제/추천)을 접었다 펼침, 판정·요약은 항상 보임.
              key로 회차를 줘 새 검사마다 remount → 펼침 상태 초기화 (A3). */}
          <ResultSummary key={inspectSeq} data={imageResult} mode="developer" collapsible />
        </div>
      )}

      {/* [코드 방식] 결과: 판정 + 요소별 상세 표 (판정별 묶음).
          판정·결과 메시지는 항상 보이고, 표는 접었다 펼침 (#3). aria-live로 결과 표시 알림. */}
      {codeResult && (
        <section
          aria-labelledby="detail"
          aria-live="polite"
          className="rounded-lg border border-rule bg-white p-5"
        >
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
          {/* 판정 + 결과 메시지 — 항상 보임 */}
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium">
            <VerdictBadge verdict={codeResult.verdict} />
            <span>
              {t('resultLabel')}: {codeResult.result_message}
            </span>
          </p>
          {/* 요소별 결과 표 — 접기/펼치기. 기본 접힘. */}
          <div className="rounded-lg border border-rule">
            <button
              type="button"
              aria-expanded={codeDetailOpen}
              onClick={() => setCodeDetailOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors hover:bg-paper"
            >
              <span>{codeDetailOpen ? t('btnCollapse') : t('btnExpand')}</span>
              <span aria-hidden className="text-graphite">
                {codeDetailOpen ? '▲' : '▼'}
              </span>
            </button>
            {codeDetailOpen && (
              <div className="border-t border-rule p-4">
                {/* 판정(FAIL/WARNING/PASS)별 묶음으로 표시 (#4) */}
                <CodeResultTable results={codeResult.results} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 두 방식 공통: 문제 해결 방법 + 요약 (개발자 모드 전용 영역). */}
      {hasResult && (
        <>
          <section aria-labelledby="solutions" className="flex flex-col gap-6">
            {/* 문제 해결 방법: 제목을 박스 안에 배치 (결과 내용과 동일한 패턴).
                접기/펼치기 헤더에 제목을 두어 배경에 떠 있지 않도록 함. */}
            <div className="rounded-xl border border-rule bg-white shadow-sm">
              <button
                type="button"
                aria-expanded={solutionsOpen}
                onClick={() => setSolutionsOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-5 py-4 text-left transition-colors hover:bg-paper"
              >
                <span className="flex items-center gap-2 text-lg font-bold">
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
                  <span className="text-sm font-medium text-graphite">
                    {solutionsOpen ? t('btnCollapse') : t('btnExpand')}
                  </span>
                </span>
                <span aria-hidden className="text-graphite">
                  {solutionsOpen ? '▲' : '▼'}
                </span>
              </button>
              {solutionsOpen && (
                <div className="border-t border-rule p-5">
                  <SolutionCards boxes={boxes} />
                </div>
              )}
            </div>
            {/* 요약(검사 결과 요약): 항상 보임. 코드 모드는 기존 통계 문구 유지, 이미지 모드는 동적 구조 (점수는 표시하지 않음) */}
            <div className="rounded-xl border border-rule bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">{t('summaryTitle')}</h2>
              {codeResult ? (
                <div className="flex flex-col gap-1.5 text-sm">
                  {codeResult.summary.total === 0 ? (
                    // 검사 결과 없음 (0개로 오해되지 않도록 별도 안내)
                    <p className="text-graphite">{t('sumEmptyCode')}</p>
                  ) : codeResult.summary.fail === 0 &&
                    codeResult.summary.warning === 0 ? (
                    // 모든 요소 PASS
                    <p className="text-graphite">{t('sumAllPassCode')}</p>
                  ) : (
                    <>
                      {/* 항목별 통계 — 값은 실제 검사 결과 */}
                      <p>
                        {t('sumTotal')}: {codeResult.summary.total}
                        {t('countUnit')}
                      </p>
                      <p>
                        {t('sumPass')}: {codeResult.summary.pass}
                        {t('countUnit')}
                      </p>
                      <p>
                        {t('sumWarn')}: {codeResult.summary.warning}
                        {t('countUnit')}
                      </p>
                      <p>
                        {t('sumFail')}: {codeResult.summary.fail}
                        {t('countUnit')}
                      </p>
                      {/* 우선 확인할 요소: FAIL 우선, 없으면 WARNING 첫 해결 카드 selector */}
                      {boxes.length > 0 && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5">
                          {t('sumPriorityEl')}:
                          <code className="rounded bg-paper px-1.5 py-0.5">
                            {boxes[0].selector}
                          </code>
                        </p>
                      )}
                      {/* FAIL 없이 WARNING만 있을 때 별도 안내, 아니면 기본 다음 단계 */}
                      <p className="text-graphite">
                        {codeResult.summary.fail === 0
                          ? t('sumWarnOnlyCode')
                          : `${t('sumNext')}: ${t('sumNextStepCode')}`}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                imageResult && (
                  <div className="flex flex-col gap-1.5 text-sm">
                    <p>
                      {t('sumIssues')}: {imageResult.issues.length}
                      {t('countUnit')}
                    </p>
                    <p>
                      {t('sumColors')}: {imageResult.palette.length}
                      {t('countUnit')}
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
