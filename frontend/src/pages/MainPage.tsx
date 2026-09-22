import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'

export default function MainPage() {
  const t = useT()
  const cards = [
    { to: '/developer', title: t('developer'), desc: t('developerDesc'), icon: '</>' },
    { to: '/user', title: t('user'), desc: t('userDesc'), icon: '▣' },
  ]
  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{t('tagline')}</h1>
        <p className="mt-3 text-graphite">{t('lead')}</p>
      </section>
      {/* Developer on the left, user on the right (per the screen design). */}
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex min-h-64 flex-col justify-between rounded-lg border border-ink bg-white p-8 hover:bg-ink hover:text-white"
          >
            <span aria-hidden className="font-mono text-2xl">{c.icon}</span>
            <span>
              <span className="block text-2xl font-bold">{c.title}</span>
              <span className="mt-2 block text-graphite group-hover:text-white/80">{c.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
