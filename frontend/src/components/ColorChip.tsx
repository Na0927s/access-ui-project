// (한국어 요약) 색상 견본 칩 — HEX 코드 옆에 실제 색 사각형을 함께 보여주는 작은 컴포넌트.
// aria-hidden: 장식(색 사각형)은 스크린리더가 읽지 않도록 제외 (접근성)
export default function ColorChip({ hex, label }: { hex: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm">
      <span aria-hidden className="inline-block size-5 rounded border border-ink/30" style={{ background: hex }} />
      {label ? `${label} ` : ''}{hex}
    </span>
  )
}
