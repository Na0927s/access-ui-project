// (한국어 요약) 대비율 안내 박스 — 숫자가 무슨 뜻인지 실제 예시로 보여주는 접기/펼침 카드.
// 개발자 모드에서 비율(예: 4.52:1)이 처음 나오는 자리 위에 배치.
// "클수록 글자가 또렷해진다"를 실제 색/글자로 체감시켜, 아래 결과와 추천 색상을 이해하게 돕는다.
import { useT } from '../i18n/useT'

// 예시용 정적 데이터 — 두 색 조합과 대비율(알려진 값), 체감 라벨.
// 색칠된 글자를 직접 렌더링해 낮은 대비가 어떻게 보이는지 눈으로 보여준다.
const EXAMPLES = [
  { fg: '#000000', bg: '#ffffff', ratio: '21.0', verdict: 'good' as const },
  { fg: '#9ca3af', bg: '#ffffff', ratio: '2.8', verdict: 'bad' as const },
]

export default function ContrastExample() {
  const t = useT()
  return (
    // <details open>: 처음엔 펼쳐져 있고, 이미 아는 사용자는 접을 수 있음
    <details className="rounded-lg border border-rule bg-paper p-4 text-sm open:bg-paper">
      <summary className="cursor-pointer select-none font-semibold">
        {t('contrastExampleTitle')}
      </summary>
      <p className="mt-2 text-graphite">{t('contrastExampleIntro')}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {EXAMPLES.map((e) => (
          <li
            key={e.fg}
            className="flex flex-wrap items-center gap-3 rounded-md border border-rule bg-white p-2"
          >
            {/* 실제 색으로 글자를 그려 대비를 눈으로 체감 — aria-hidden: 장식 */}
            <span
              aria-hidden
              className="grid h-8 w-16 place-items-center rounded text-base font-bold"
              style={{ background: e.bg, color: e.fg }}
            >
              가Aa
            </span>
            <span className="font-mono text-xs text-graphite">
              {e.fg} / {e.bg}
            </span>
            <span className="tabular-nums font-semibold">{e.ratio}:1</span>
            <span className="font-medium">
              {e.verdict === 'good' ? `✓ ${t('contrastExampleGood')}` : `✕ ${t('contrastExampleBad')}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-graphite">→ {t('contrastExampleOutro')}</p>
    </details>
  )
}
