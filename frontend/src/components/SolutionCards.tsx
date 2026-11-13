// (한국어 요약) 문제 해결 방법 카드 목록 — 개발자 모드 전용.
// 요소별 문제 + 복사 가능한 CSS 수정안(색 추천) + 색 이외의 개선 팁을 카드 형태로 표시
// 모든 #RRGGBB 색상 코드 옆에 실제 색 견본(ColorChip)을 함께 렌더링한다.
import { Fragment, useState } from 'react'
import ColorChip from './ColorChip'
import type { SolutionBox } from '../api/types'
import { useT } from '../i18n/useT'

// 텍스트에서 모든 HEX 색상(#RRGGBB)을 추출 (중복 포함, 발생 순서대로).
function extractAllHex(text: string): string[] {
  return text.match(/#[0-9a-fA-F]{6}\b/g) ?? []
}

// 텍스트를 #RRGGBB 기준으로 분할해, 매칭된 부분은 ColorChip(색 사각형+hex)으로,
// 나머지는 일반 텍스트로 렌더링. selector·problem 등 인라인 텍스트에 사용.
function renderTextWithColors(text: string) {
  const parts = text.split(/(#[0-9a-fA-F]{6})\b/)
  return parts.map((part, idx) => {
    if (/^#[0-9a-fA-F]{6}$/.test(part)) {
      return <ColorChip key={idx} hex={part} />
    }
    return <Fragment key={idx}>{part}</Fragment>
  })
}

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
      {boxes.map((b, i) => {
        // css_fix에 포함된 모든 색상 코드 (코드 블록 아래 견본 영역용)
        const cssColors = b.css_fix ? extractAllHex(b.css_fix) : []
        return (
          <li
            key={`${b.selector}-${i}`}
            className="flex flex-col gap-3 rounded-xl border border-rule bg-white p-5 shadow-sm"
          >
            {/* 카드 머리: 요소 선택자 + 검사 유형 라벨. selector 내 색상 코드는 견본 표시 */}
            <div className="flex items-center justify-between gap-2">
              <code className="truncate text-sm font-semibold">
                {renderTextWithColors(b.selector)}
              </code>
              <span className="shrink-0 rounded-full border border-ink px-2.5 py-0.5 text-xs">
                {CHECK_LABEL[b.check_type]}
              </span>
            </div>
            {/* 문제 설명 — 색 견본 없이 일반 텍스트로만 표시 */}
            <p className="text-sm leading-relaxed">{b.problem}</p>
            {/* CSS 수정안이 있으면 코드 블록 + 복사 버튼 표시 */}
            {b.css_fix && (
              <div className="flex flex-col gap-2">
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
                {/* 코드에 포함된 모든 색상 코드를 색 견본으로 나열 (원본→추천 등) */}
                {cssColors.length > 0 && (
                  <div className="flex flex-wrap gap-3 rounded-lg border border-rule bg-paper/50 px-2.5 py-2">
                    {cssColors.map((hex, idx) => (
                      <ColorChip key={`${hex}-${idx}`} hex={hex} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* 색 이외의 개선 팁 (아이콘 추가, 테두리 활용 등) */}
            {b.non_color_fix && (
              <p className="border-t border-rule pt-2 text-sm text-graphite">💡 {b.non_color_fix}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
