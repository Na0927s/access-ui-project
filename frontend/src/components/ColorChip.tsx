export default function ColorChip({ hex, label }: { hex: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm">
      <span aria-hidden className="inline-block size-5 rounded border border-ink/30" style={{ background: hex }} />
      {label ? `${label} ` : ''}{hex}
    </span>
  )
}
