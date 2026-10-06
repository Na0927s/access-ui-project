// (한국어 요약) 분석 결과 요약 뷰 — 이미지 분석(사용자/개발자 모드 공용)의 결과 내용 영역.
// 종합 판정 → 점수 → AI/요약 설명 → 주요 색상 → 발견된 문제 → (개발자 모드) 추천 색상 순으로 표시
import { useEffect, useState } from 'react'
import { explain, type Explanation } from '../api/client'
import type { ImageAnalysis } from '../api/types'
import { useT } from '../i18n/useT'
import { useUiStore } from '../stores/uiStore'
import ColorChip from './ColorChip'
import ScoreBlock from './ScoreBlock'
import VerdictBadge from './VerdictBadge'

export default function ResultSummary({ data, mode }: { data: ImageAnalysis; mode: 'user' | 'developer' }) {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const [ai, setAi] = useState<Explanation | null>(null) // AI/요약 설명 응답

  // 분석 결과나 언어가 바뀔 때마다 AI 설명 요청을 다시 보냄
  useEffect(() => {
    let alive = true // 컴포넌트가 언마운트된 뒤 상태 업데이트 방지 (메모리 누수/경고 방지)
    explain(data, lang, mode).then((r) => alive && setAi(r)).catch(() => alive && setAi(null))
    return () => { alive = false } // 정리(cleanup): 언마운트되면 플래그 끄기
  }, [data, lang, mode])

  // 추천 색상 등급 라벨 변환 (STRONG → "✓ 강력 추천" 등)
  const GRADE_LABEL = {
    STRONG: t('gradeStrong'),
    RECOMMENDED: t('gradeRecommended'),
    CONDITIONAL: t('gradeConditional'),
  } as const

  return (
    // aria-labelledby로 섹션 제목과 연결 — 스크린리더가 영역 이름을 읽음
    <section aria-labelledby="result-content" className="flex flex-col gap-6 rounded-lg border border-rule bg-white p-5">
      <h2 id="result-content" className="text-lg font-bold">{t('resultContent')}</h2>
      {/* 종합 판정 + 한 줄 메시지 */}
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <VerdictBadge verdict={data.verdict} />
        <span>{t('resultLabel')}: {data.result_message}</span>
      </p>
      {/* 접근성 점수 (자체 지표 고지 문구 포함) */}
      <ScoreBlock score={data.score} notice={data.score_notice} />

      {/* AI 설명(또는 AI 없을 때 백엔드 템플릿 요약) — 출처를 라벨로 구분해 표시 */}
      {ai && (
        <div className="rounded border border-rule p-3 text-sm">
          <p className="mb-1 text-xs text-graphite">{ai.source === 'ai' ? t('aiExplain') : t('plainExplain')}</p>
          <p>{ai.summary}</p>
        </div>
      )}

      {/* 주요 색상 팔레트: 색 견본 + HEX + 화면 차지 비율(%) */}
      <div>
        <h3 className="mb-2 font-semibold">{t('palette')}</h3>
        <ul className="flex flex-wrap gap-3">
          {data.palette.map((c) => (
            <li key={c.hex}><ColorChip hex={c.hex} /> <span className="text-sm text-graphite">{(c.ratio * 100).toFixed(1)}%</span></li>
          ))}
        </ul>
      </div>

      {/* 발견된 문제 목록: 심각도 배지 + 관련 색상 + 설명 문구 */}
      <div>
        <h3 className="mb-2 font-semibold">{t('issues')}</h3>
        {data.issues.length === 0 ? (
          <p className="text-sm">✓ {t('noIssues')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.issues.map((issue) => (
              <li key={issue.id} className="flex flex-wrap items-center gap-2 text-sm">
                {/* 심각도 HIGH는 FAIL 배지, 아니면 WARNING 배지로 표시 */}
                <VerdictBadge verdict={issue.severity === 'HIGH' ? 'FAIL' : 'WARNING'} />
                {issue.colors.map((c) => <ColorChip key={c} hex={c} />)}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 추천 색상 — 규칙 7번에 따라 개발자 모드에서만 표시 */}
      {mode === 'developer' && data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">{t('recommend')}</h3>
          <ul className="flex flex-col gap-3">
            {data.recommendations.map((r, i) => (
              <li key={`${r.current}-${r.against}-${i}`} className="text-sm">
                {/* 현재 색 vs 상대(배경) 색 표시 */}
                <p><ColorChip hex={r.current} label={t('current')} /> <span className="text-graphite">vs {r.against}</span></p>
                {r.candidates.length > 0 ? (
                  // 추천 후보 목록: 색 견본 + 대비율 + 등급 + 이유 설명
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
                  // 재검증을 통과한 색이 없는 경우: 색 변경만으로는 부족하다는 안내 + 대체 팁
                  <p className="mt-1 ml-4 text-graphite">{t('colorHard')} {r.non_color_tips[0]}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
