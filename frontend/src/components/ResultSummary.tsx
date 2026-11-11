// (한국어 요약) 분석 결과 요약 뷰 — 이미지 분석(사용자/개발자 모드 공용)의 결과 내용 영역.
// 종합 판정 → (사용자) 쉬운 설명 / (개발자) AI 설명 → 주요 색상 → 발견된 문제(이슈별 설명 포함)
// → (개발자 모드) 추천 색상 순으로 표시. 점수는 더 이상 표시하지 않는다.
import { useEffect, useState } from 'react'
import { explain, type Explanation } from '../api/client'
import type { ImageAnalysis } from '../api/types'
import { useT } from '../i18n/useT'
import { useUiStore } from '../stores/uiStore'
import ColorChip from './ColorChip'
import VerdictBadge from './VerdictBadge'

export default function ResultSummary({
  data,
  mode,
}: {
  data: ImageAnalysis
  mode: 'user' | 'developer'
}) {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const [ai, setAi] = useState<Explanation | null>(null) // AI/요약 설명 응답

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

  return (
    // aria-labelledby로 섹션 제목과 연결 — 스크린리더가 영역 이름을 읽음
    <section
      aria-labelledby="result-content"
      className="flex flex-col gap-6 rounded-xl border border-rule bg-white p-6 shadow-sm"
    >
      <h2 id="result-content" className="text-lg font-bold">
        {t('resultContent')}
      </h2>
      {/* 종합 판정 + 짧은 의미 + 설명 (PASS/WARNING/FAIL이 무슨 뜻인지 바로 알 수 있게) */}
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

      {/* AI 설명(또는 AI 없을 때 백엔드 템플릿 요약) — 출처를 라벨로 구분해 표시 */}
      {ai && (
        <div className="rounded-lg border border-rule p-4 text-sm leading-relaxed">
          <p className="mb-1 text-xs font-semibold text-graphite">
            {ai.source === 'ai' ? t('aiExplain') : t('plainExplain')}
          </p>
          <p>{ai.summary}</p>
        </div>
      )}

      {/* 주요 색상 팔레트: 색 견본 + HEX + 화면 차지 비율(%) */}
      <div>
        <h3 className="mb-2.5 font-semibold">{t('palette')}</h3>
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
        <h3 className="mb-2.5 font-semibold">{t('issues')}</h3>
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

      {/* 추천 색상 — 규칙 7번에 따라 개발자 모드에서만 표시 */}
      {mode === 'developer' && data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h3 className="mb-2.5 font-semibold">{t('recommend')}</h3>
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
                  // 추천 후보 목록: 색 견본 + 대비율 + 등급 + 이유 설명 + 쉬운 한 줄 안내
                  <ul className="flex flex-col gap-2">
                    {r.candidates.map((c) => (
                      <li key={c.hex} className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span aria-hidden>→</span>
                          <ColorChip hex={c.hex} />
                          <span className="tabular-nums">{c.ratio.toFixed(2)}:1</span>
                          <strong>{GRADE_LABEL[c.grade]}</strong>
                          <span className="text-graphite">{c.reason}</span>
                        </div>
                        {/* 비율·등급 아래에 일반인도 이해할 수 있는 쉬운 설명 */}
                        <p className="pl-5 text-xs text-graphite">💡 {t('recommendEasyHint')}</p>
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
    </section>
  )
}
