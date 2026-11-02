// (한국어 요약) 접근성 점수 표시 블록 — 점수(0~100)를 크게 보여주고
// 규칙 7번에 따라 "자체 지표, 공식 WCAG 점수 아님" 고지 문구를 필수로 함께 표시
import { useT } from '../i18n/useT'

export default function ScoreBlock({ score, notice }: { score: number; notice: string }) {
  const t = useT()
  return (
    <div>
      <p className="text-sm text-graphite">{t('score')}</p>
      {/* tabular-nums: 숫자 자릿수 폭을 고정해 세로 정렬이 흐트러지지 않게 함 */}
      <p className="text-4xl font-bold tabular-nums">
        {score}
        <span className="text-lg font-normal text-graphite"> / 100</span>
      </p>
      {/* 자체 지표 고지 문구 (백엔드에서 내려준 문구 그대로 표시) */}
      <p className="mt-1 text-xs text-graphite">※ {notice}</p>
    </div>
  )
}
