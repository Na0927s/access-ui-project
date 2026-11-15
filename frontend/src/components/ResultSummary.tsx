// (한국어 요약) 분석 결과 요약 뷰 — 이미지 분석(사용자/개발자 모드 공용)의 결과 내용 영역.
// 종합 판정 → (통합) 요약 설명 → 주요 색상 → 발견된 문제(이슈별 설명 포함)
// → (개발자 모드) 추천 색상 순으로 표시. 점수는 더 이상 표시하지 않는다.
// collapsible=true면 상세 영역(주요 색상/문제/추천)을 접었다 펼칠 수 있고,
// 판정 + 요약 설명 상자는 항상 보이도록 둔다 (개발자 모드 검사 화면).
import { useEffect, useState } from 'react'
import { explain, type Explanation } from '../api/client'
import type { ImageAnalysis } from '../api/types'
import { useT } from '../i18n/useT'
import { useUiStore } from '../stores/uiStore'
import ColorChip from './ColorChip'
import InfoPopover from './InfoPopover'
import VerdictBadge from './VerdictBadge'

export default function ResultSummary({
  data,
  mode,
  collapsible = false,
}: {
  data: ImageAnalysis
  mode: 'user' | 'developer'
  collapsible?: boolean
}) {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const [ai, setAi] = useState<Explanation | null>(null) // AI/요약 설명 응답
  const [copiedHex, setCopiedHex] = useState<string | null>(null) // 추천 색상 HEX 복사 표시
  // 상세 영역(주요 색상/문제/추천) 펼침 여부.
  // collapsible 모드에서는 첫 검사 직후 펼쳐진 상태로 보이도록 기본 true.
  // (문제 해결 방법은 별도 영역으로 기본 접힘 상태 — 결과는 먼저 보여주는 게 자연스러움)
  const [open, setOpen] = useState(true)

  // 분석 결과가 바뀌면 펼침 상태를 초기화 (A3).
  // 결과 내역에서 다른 기록을 열거나 새 검사를 했을 때 이전 펼침 상태가 이월되는 것을 방지.
  useEffect(() => {
    setOpen(true)
  }, [data])

  // 분석 결과나 언어가 바뀔 때마다 AI 설명 요청을 다시 보냄.
  // AbortController로 진행 중인 이전 요청을 취소해 경쟁(race)과 불필요한 네트워크 호출을 방지.
  useEffect(() => {
    const ctrl = new AbortController()
    explain(data, lang, mode, ctrl.signal)
      .then((r) => setAi(r))
      .catch((e: unknown) => {
        // abort로 취소된 요청은 무시. 그 외 실제 실패만 fallback으로 처리.
        if (!(e instanceof DOMException && e.name === 'AbortError')) setAi(null)
      })
    return () => {
      ctrl.abort()
    } // 정리(cleanup): 언마운트 또는 의존성 변경 시 이전 요청 취소
  }, [data, lang, mode])

  // AI 응답의 이슈별 설명을 id로 매칭. 없으면 백엔드 이슈 메시지를 그대로 쓴다.
  const explanationFor = (issueId: number) =>
    ai?.issues?.find((x) => x.id === issueId)?.explanation

  // 추천 색상 등급 라벨 변환 (STRONG → "✓ 강력 추천" 등)
  const GRADE_LABEL = {
    STRONG: t('gradeStrong'),
    RECOMMENDED: t('gradeRecommended'),
    CONDITIONAL: t('gradeConditional'),
  } as const

  // 상세 영역: 주요 색상 / 발견된 문제 / 추천 색상.
  // collapsible에서는 이 블록이 접히고, 그렇지 않으면 그대로 펼쳐 보인다.
  const details = (
    <>
      {/* 주요 색상 팔레트: 색 견본 + HEX + 화면 차지 비율(%) */}
      <div>
        <h3 className="mb-2.5 font-semibold">
          {t('palette')}
          {mode === 'developer' && (
            <InfoPopover label={t('palette')}>
              <p className="mb-1 font-semibold">{t('popPaletteTitle')}</p>
              <p className="text-graphite">{t('popPaletteBody')}</p>
            </InfoPopover>
          )}
        </h3>
        <ul className="flex flex-wrap gap-3">
          {data.palette.map((c) => (
            <li key={c.hex} className="flex items-center gap-1.5">
              <ColorChip hex={c.hex} />{' '}
              <span className="text-sm text-graphite">{(c.ratio * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 발견된 문제 목록: 심각도 배지 + 관련 색상 + 설명 문구 + (있으면) 쉬운 풀이 */}
      <div>
        <h3 className="mb-2.5 font-semibold">
          {t('issues')}
          {mode === 'developer' && (
            <InfoPopover label={t('issues')}>
              <p className="mb-1 font-semibold">{t('popIssuesTitle')}</p>
              <p className="mb-2 text-graphite">{t('popIssuesTargetBody')}</p>
              <p className="mb-0.5 font-semibold">{t('popIssuesContrastTitle')}</p>
              <p className="mb-2 text-graphite">{t('popIssuesContrastBody')}</p>
              <p className="mb-0.5 font-semibold">{t('popIssuesDistanceTitle')}</p>
              <p className="mb-2 text-graphite">{t('popIssuesDistanceBody')}</p>
              <p className="mb-0.5 font-semibold">{t('popIssuesOverallTitle')}</p>
              <p className="mb-2 text-graphite">{t('popIssuesOverallBody')}</p>
              <p className="mb-1 font-semibold">{t('popVerdictMeaningTitle')}</p>
              <p className="text-graphite">{t('popPassDesc')}</p>
              <p className="text-graphite">{t('popWarnDesc')}</p>
              <p className="text-graphite">{t('popFailDesc')}</p>
            </InfoPopover>
          )}
        </h3>
        {data.issues.length === 0 ? (
          <p className="rounded-lg bg-paper p-3 text-sm">✓ {t('noIssues')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.issues.map((issue) => {
              const exp = explanationFor(issue.id)
              return (
                <li
                  key={issue.id}
                  className="flex flex-col gap-1.5 rounded-lg border border-rule p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 심각도 HIGH는 FAIL 배지, 아니면 WARNING 배지로 표시 */}
                    <VerdictBadge verdict={issue.severity === 'HIGH' ? 'FAIL' : 'WARNING'} />
                    {issue.colors.map((c) => (
                      <ColorChip key={c} hex={c} />
                    ))}
                    <span>{issue.message}</span>
                  </div>
                  {/* 이슈별 쉬운 풀이 설명 (메시지와 중복되지 않을 때만) */}
                  {exp && exp !== issue.message && (
                    <p className="pl-1 text-graphite">→ {exp}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 추천 색상 — 규칙 7번에 따라 개발자 모드에서만 표시.
          간소화: 대비율 숫자·AA/AAA 기술 수치는 숨기고(상세는 ⓘ 팝오버에서 확인),
          색상 칩 + HEX + 복사 + 등급 라벨 + 쉬운 이유만 표시. */}
      {mode === 'developer' && data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h3 className="mb-2.5 font-semibold">
            {t('recommend')}
            <InfoPopover label={t('recommend')}>
              <p className="mb-1 font-semibold">{t('popRecommendTitle')}</p>
              <p className="mb-2 text-graphite">{t('popRecommendBody')}</p>
              <p className="text-graphite">💡 {t('popRecommendEasy')}</p>
            </InfoPopover>
          </h3>
          <ul className="flex flex-col gap-3">
            {data.recommendations.map((r, i) => (
              <li
                key={`${r.current}-${r.against}-${i}`}
                className="rounded-lg border border-rule p-3 text-sm"
              >
                {/* 현재 색 vs 상대(배경) 색 표시 */}
                <p className="mb-1.5">
                  <ColorChip hex={r.current} label={t('current')} />{' '}
                  <span className="text-graphite">vs {r.against}</span>
                </p>
                {r.candidates.length > 0 ? (
                  // 추천 후보 목록: 색 견본 + HEX + 복사 버튼 + 등급 라벨(강력 추천 강조) + 쉬운 안내
                  <ul className="flex flex-col gap-2">
                    {r.candidates.map((c) => (
                      <li key={c.hex} className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span aria-hidden>→</span>
                          <ColorChip hex={c.hex} />
                          <button
                            type="button"
                            className="shrink-0 rounded border border-rule px-2 py-0.5 text-xs font-medium transition-colors hover:bg-ink hover:text-white"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(c.hex)
                                .then(() => setCopiedHex(c.hex))
                                .catch(() => setCopiedHex(null))
                            }
                          >
                            {copiedHex === c.hex ? `✓ ${t('copied')}` : t('copyHex')}
                          </button>
                          {/* 강력 추천(STRONG)은 배경으로 강조 */}
                          <strong
                            className={
                              c.grade === 'STRONG'
                                ? 'rounded bg-ink px-2 py-0.5 text-xs text-white'
                                : 'text-xs'
                            }
                          >
                            {GRADE_LABEL[c.grade]}
                          </strong>
                        </div>
                        {/* 수치 대신 쉬운 문장으로 추천 이유 설명 */}
                        <p className="pl-5 text-xs text-graphite">💡 {t('recommendEasyHintSimple')}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  // 재검증을 통과한 색이 없는 경우: 색 변경만으로는 부족하다는 안내 + 대체 팁
                  <p className="text-graphite">
                    {t('colorHard')} {r.non_color_tips[0]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )

  return (
    // aria-labelledby로 섹션 제목과 연결 — 스크린리더가 영역 이름을 읽음
    <section
      aria-labelledby="result-content"
      className="flex flex-col gap-6 rounded-xl border border-rule bg-white p-6 shadow-sm"
    >
      <h2 id="result-content" className="text-lg font-bold">
        {t('resultContent')}
      </h2>
      {/* 종합 판정 + 짧은 의미 + 설명 (PASS/WARNING/FAIL이 무슨 뜻인지 바로 알 수 있게) — 항상 보임 */}
      <div className="flex flex-col gap-1.5 rounded-lg bg-paper p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          <VerdictBadge verdict={data.verdict} />
          {/* 판정의 짧은 의미 (일반인도 바로 이해하도록) */}
          <span className="font-semibold">
            {data.verdict === 'PASS'
              ? t('verdictPassShort')
              : data.verdict === 'WARNING'
                ? t('verdictWarnShort')
                : t('verdictFailShort')}
          </span>
        </div>
        <p className="text-graphite">
          {data.verdict === 'PASS'
            ? t('verdictPassDesc')
            : data.verdict === 'WARNING'
              ? t('verdictWarnDesc')
              : t('verdictFailDesc')}
        </p>
      </div>

      {/* 요약 상자: AI 설명과 이전 안내 문구(imgResultIntro)를 하나로 통합해 표시.
          AI 응답이 있으면 그것을, 없으면 백엔드 검사 결과 기반 안내 문구를 보여준다.
          개발자 모드는 항상 표시, 사용자 모드는 AI 응답이 있을 때만 표시. — 항상 보임 */}
      {(ai || mode === 'developer') && (
        <div className="rounded-lg border border-rule p-4 text-sm leading-relaxed">
          <p className="mb-1 text-xs font-semibold text-graphite">
            {ai?.source === 'ai' ? t('aiExplain') : t('plainExplain')}
          </p>
          <p>
            {ai
              ? ai.summary
              : data.issues.length > 0
                ? t('imgResultIntro', { count: data.issues.length })
                : t('imgResultIntroOk')}
          </p>
        </div>
      )}

      {/* 상세 영역(주요 색상/문제/추천): collapsible이면 접었다 펼침, 아니면 그대로 펼침.
          collapsible 헤더는 코드 모드(CodeResultDetail)와 동일한 "제목 + 펼쳐보기/접기" 패턴. */}
      {collapsible ? (
        <div className="rounded-lg border border-rule">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left transition-colors hover:bg-paper"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {t('resultContent')}
              <span className="font-medium text-graphite">
                {open ? t('btnCollapse') : t('btnExpand')}
              </span>
            </span>
            <span aria-hidden className="text-graphite">
              {open ? '▲' : '▼'}
            </span>
          </button>
          {open && (
            <div className="flex flex-col gap-6 border-t border-rule p-4">{details}</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">{details}</div>
      )}
    </section>
  )
}
