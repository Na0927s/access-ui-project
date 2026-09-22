import { useT } from '../i18n/useT'

export default function ScoreBlock({ score, notice }: { score: number; notice: string }) {
  const t = useT()
  return (
    <div>
      <p className="text-sm text-graphite">{t('score')}</p>
      <p className="text-4xl font-bold tabular-nums">{score}<span className="text-lg font-normal text-graphite"> / 100</span></p>
      <p className="mt-1 text-xs text-graphite">※ {notice}</p>
    </div>
  )
}
