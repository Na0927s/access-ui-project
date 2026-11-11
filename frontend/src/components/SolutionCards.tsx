// (한국어 요약) 문제 해결 방법 카드 목록 — 개발자 모드 전용.
// 요소별 문제 + 복사 가능한 CSS 수정안(색 추천) + 색 이외의 개선 팁을 카드 형태로 표시
import { useState } from 'react'
import type { SolutionBox } from '../api/types'
import { useT } from '../i18n/useT'

export default function SolutionCards({ boxes }: { boxes: SolutionBox[] }) {
  const t = useT()
  const [copied, setCopied] = useState<number | null>(null) // 마지막으로 복사한 카드 index
  // 검사 유형(CONTRAST/COLOR_ONLY)을 언어에 맞는 라벨로 변환
  const CHECK_LABEL = {
    CONTRAST: t('checkContrast'),
    COLOR_ONLY: t('checkColorOnly'),
  } as const

  // 수정할 항목이 없으면 안내 문구만 표시
  if (boxes.length === 0)
    return (
      <p className="rounded-lg border border-rule bg-white p-4 text-sm">
        ✓ {t('noFixNeeded')}
      </p>
    )

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {boxes.map((b, i) => (
        <li
          key={`${b.selector}-${i}`}
          className="flex flex-col gap-3 rounded-xl border border-rule bg-white p-5 shadow-sm"
        >
          {/* 카드 머리: 요소 선택자 + 검사 유형 라벨 */}
          <div className="flex items-center justify-between gap-2">
            <code className="truncate text-sm font-semibold">{b.selector}</code>
            <span className="shrink-0 rounded-full border border-ink px-2.5 py-0.5 text-xs">
              {CHECK_LABEL[b.check_type]}
            </span>
          </div>
          {/* 문제 설명 */}
          <p className="text-sm leading-relaxed">{b.problem}</p>
          {/* CSS 수정안이 있으면 코드 블록 + 복사 버튼 표시 */}
          {b.css_fix && (
            <div className="flex items-stretch gap-2">
              <pre className="flex-1 overflow-x-auto rounded-lg bg-paper p-2.5 text-xs">{b.css_fix}</pre>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-ink px-3 text-xs font-medium transition-colors hover:bg-ink hover:text-white"
                onClick={() => navigator.clipboard.writeText(b.css_fix!).then(() => setCopied(i))}
              >
                {copied === i ? `✓ ${t('copied')}` : t('copy')}
              </button>
            </div>
          )}
          {/* 색 이외의 개선 팁 (아이콘 추가, 테두리 활용 등) */}
          {b.non_color_fix && (
            <p className="border-t border-rule pt-2 text-sm text-graphite">💡 {b.non_color_fix}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
