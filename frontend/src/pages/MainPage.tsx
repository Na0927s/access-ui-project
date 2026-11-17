// (한국어 요약) 메인(홈) 페이지 — 에디토리얼/기업 사이트 톤(미니멀, 가는 선, 타이포 중심).
// 전체 폭 띠(검정 PALETTE / 연회색 START CHECK)를 쓰기 위해 각 섹션이 안쪽에서 폭을 잡는다.
// 무채색 UI 컨셉 유지(규칙 8) — 화면에서 색을 가진 요소는 오직 분석 대상 이미지뿐.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'

// 공통: 안쪽 내용 폭 컨테이너 (App의 main가 폭 제한이 없으므로 여기서 잡음)
const INNER = 'mx-auto w-full max-w-6xl px-4'
// 공통: 작은 모노 라벨 (10~11px, 자간 넓게, 대문자, 회색)
const MONO = 'font-mono text-[11px] tracking-[0.2em] uppercase'

// ---- 인라인 라인 아이콘 (1.5px stroke) ----
function ImageIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function CodeIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ShieldCheckIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ArrowUpRightIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function EyeIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}
function TargetIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
  )
}
function SparkleIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" strokeLinejoin="round" />
      <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" strokeLinejoin="round" />
    </svg>
  )
}

// PALETTE 회색 단계 띠 — 흰색부터 거의 검정까지 11단계
const PALETTE_STEPS = [
  '#FFFFFF', '#F5F5F5', '#EBEBEB', '#DEDEDE', '#CCCCCC', '#ABABAB',
  '#8A8A8A', '#6B6B6B', '#4A4A4A', '#2B2B2B', '#141414',
]

export default function MainPage() {
  const t = useT()
  const [introOpen, setIntroOpen] = useState(false) // 사이트 간단 설명 펼침 여부(기본 접힘)

  // 히어로 / 시작 카드용 버튼 스타일 공통
  const btnPrimary =
    'inline-flex h-[34px] items-center gap-1.5 rounded-md bg-ink px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-black'
  // 개발자 그룹: 두 버튼을 하나의 캡슐처럼 묶는 컨테이너 + 내부 버튼(자체 테두리 없음)
  const devGroupWrap = 'inline-flex h-[34px] items-stretch overflow-hidden rounded-md border border-line bg-white transition-colors hover:border-faint'
  const devGroupBtn =
    'inline-flex items-center gap-1.5 px-3.5 text-[13px] font-bold text-ink transition-colors hover:bg-mist'

  const startCards = [
    {
      to: '/user',
      label: t('homeCard1Label'),
      title: t('homeCard1Title'),
      desc: t('homeCard1Desc'),
    },
    {
      to: '/developer',
      label: t('homeCard2Label'),
      title: t('homeCard2Title'),
      desc: t('homeCard2Desc'),
    },
  ]

  const features = [
    { no: '01', title: t('homeFeature1'), desc: t('homeFeature1Desc'), Icon: EyeIcon },
    { no: '02', title: t('homeFeature2'), desc: t('homeFeature2Desc'), Icon: TargetIcon },
    { no: '03', title: t('homeFeature3'), desc: t('homeFeature3Desc'), Icon: SparkleIcon },
  ]

  const howSteps = [
    { no: '01', title: t('homeHow1Title'), desc: t('homeHow1Desc') },
    { no: '02', title: t('homeHow2Title'), desc: t('homeHow2Desc') },
    { no: '03', title: t('homeHow3Title'), desc: t('homeHow3Desc') },
  ]

  return (
    <div className="flex flex-col">
      {/* (1) 상단 라벨 줄 + 히어로 */}
      <section className="pt-12">
        <div className={INNER}>
          {/* 좌측 모노 라벨 + 우측 모노 라벨 */}
          <div className="flex items-center justify-between">
            <span className={`${MONO} text-graphite`}>{t('homeLabelCvd')}</span>
            <span className={`${MONO} text-faint`}>{t('homeLabelMono')}</span>
          </div>
          {/* 내용 폭만큼 1px 연회색 선 */}
          <div className="mt-3 h-px w-full bg-line" />
        </div>

        {/* (2) 히어로 — 좌우 2단 */}
        <div className={`${INNER} mt-8`}>
          <div className="flex flex-col gap-10 md:flex-row md:items-stretch md:justify-between">
            {/* 왼쪽 ~60%: 제목 + lead + 버튼(맨 아래) */}
            <div className="flex flex-col md:w-[58%]">
              <h1 className="max-w-xl text-[36px] font-extrabold leading-[1.12] tracking-tight text-ink md:text-[54px]">
                {t('tagline')}
              </h1>
              <p className="mt-6 max-w-[380px] text-base leading-relaxed text-graphite md:text-lg">
                {t('lead')}
              </p>
              {/* "+ 간단히 보기" 토글 — 사이트 간단 설명 펼침/접힘 (기존 기능 유지) */}
              <div className="mt-8 md:mt-auto">
                <button
                  type="button"
                  aria-expanded={introOpen}
                  onClick={() => setIntroOpen((v) => !v)}
                  className="text-[13px] font-medium text-graphite transition-colors hover:text-ink"
                >
                  {introOpen
                    ? `${t('homeIntroToggle')} −`
                    : `+ ${t('homeIntroToggle')}`}
                </button>
                {introOpen && (
                  <p className="mt-3 max-w-md border-l border-line pl-4 text-[13px] leading-relaxed text-graphite">
                    {t('homeIntro')}
                  </p>
                )}
              </div>
            </div>

            {/* 오른쪽 ~35%: HOW IT WORKS 카드 */}
            <div className="rounded-xl border border-line bg-mist p-5 md:w-[36%]">
              <span className={`${MONO} text-graphite`}>{t('homeHowLabel')}</span>
              <div className="mt-4 flex flex-col">
                {howSteps.map((s, i) => (
                  <div key={s.no}>
                    {i > 0 && <div className="my-3 h-px w-full bg-line" />}
                    <div className="flex gap-3">
                      <span className={`${MONO} pt-0.5 text-faint`}>{s.no}</span>
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-bold text-ink">{s.title}</p>
                        <p className="text-xs leading-relaxed text-graphite">{s.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* 맨 아래 구분선 + privacy 안내 */}
              <div className="mt-4 h-px w-full bg-line" />
              <div className="mt-3 flex items-center gap-1.5 text-faint">
                <ShieldCheckIcon className="size-3.5" />
                <span className="text-[11px] leading-relaxed">{t('homeHowPrivacy')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 히어로 아래 전체 폭 구분선 */}
      <div className="mt-12 h-px w-full bg-line" />

      {/* (3) 어디서 시작할까요 */}
      <section className="py-12">
        <div className={INNER}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">{t('homeStartTitle')}</h2>
            <span className={`${MONO} text-faint`}>01 / 02</span>
          </div>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {startCards.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="group flex h-[180px] flex-col rounded-xl border border-line bg-white p-6 transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-white"
              >
                <div className="flex items-start justify-between">
                  <span className={`${MONO} text-faint transition-colors group-hover:text-white/50`}>
                    {c.label}
                  </span>
                  <span className="flex size-6 items-center justify-center rounded-full border border-line text-graphite transition-colors group-hover:border-white group-hover:text-white">
                    <ArrowUpRightIcon />
                  </span>
                </div>
                <div className="mt-auto">
                  <h3 className="text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-white">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-graphite transition-colors group-hover:text-white/70">
                    {c.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 섹션 끝 전체 폭 구분선 */}
      <div className="h-px w-full bg-line" />

      {/* (4) FEATURES — 좌우 2단 */}
      <section className="py-12">
        <div className={INNER}>
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            {/* 왼쪽 ~25% */}
            <div className="md:w-[25%]">
              <span className={`${MONO} text-graphite`}>{t('homeFeaturesLabel')}</span>
              <h2 className="mt-3 text-xl font-bold leading-snug tracking-tight text-ink">
                {t('homeFeaturesTitle')}
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-graphite">
                {t('homeFeaturesIntro')}
              </p>
            </div>
            {/* 오른쪽 ~70%: 3행 리스트 */}
            <div className="md:w-[70%]">
              <div className="h-px w-full bg-line" />
              {features.map((f) => (
                <div
                  key={f.no}
                  className="group -mx-2 border-b border-line px-2 py-6 transition-colors hover:bg-mist"
                >
                  <div className="flex items-center gap-5">
                    <span className={`${MONO} w-8 shrink-0 text-faint transition-colors group-hover:text-ink`}>
                      {f.no}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{f.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-graphite">{f.desc}</p>
                    </div>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-graphite transition-colors duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-white">
                      <f.Icon />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* (5) PALETTE — 전체 폭 검정 띠 */}
      <section className="bg-ink py-12 text-white">
        <div className={INNER}>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            {/* 왼쪽 */}
            <div className="md:w-1/2">
              <span className={`${MONO} text-white/50`}>{t('homePaletteLabel')}</span>
              <h2 className="mt-3 max-w-sm text-[22px] font-bold leading-snug tracking-tight">
                {t('homePaletteTitle')}
              </h2>
              <p className="mt-3 max-w-[240px] text-xs leading-relaxed text-white/60">
                {t('homePaletteDesc')}
              </p>
            </div>
            {/* 오른쪽: 회색 단계 띠 */}
            <div className="md:w-1/2">
              <div className="flex h-[52px] w-full overflow-hidden rounded">
                {PALETTE_STEPS.map((c) => (
                  <div key={c} className="flex-1" style={{ backgroundColor: c }} aria-hidden />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`${MONO} text-[10px] text-white/50`}>{t('homePaletteLight')}</span>
                <span className={`${MONO} text-[10px] text-white/50`}>{t('homePaletteMid')}</span>
                <span className={`${MONO} text-[10px] text-white/50`}>{t('homePaletteDark')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* (6) START CHECK — 전체 폭 연회색 띠 */}
      <section className="bg-mist py-10">
        <div className={INNER}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* 왼쪽 */}
            <div className="md:max-w-[420px]">
              <span className={`${MONO} text-graphite`}>{t('homeStartCheckLabel')}</span>
              <h2 className="mt-3 max-w-[330px] text-[19px] font-bold leading-snug tracking-tight text-ink">
                {t('homeStartCheckTitle')}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-graphite">
                {t('homeStartCheckDesc')}
              </p>
            </div>
            {/* 오른쪽: 사용자 버튼 + 개발자 그룹(이미지/코드를 하나의 캡슐로 묶음) */}
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/user" className={btnPrimary}>
                <ImageIcon />
                {t('homeStartBtnImage')}
              </Link>
              {/* 개발자 · 이미지 / 코드 — 하나의 버튼처럼 보이지만 각각 클릭 가능 */}
              <div className={devGroupWrap}>
                <Link to="/developer" className={devGroupBtn}>
                  <ImageIcon />
                  {t('homeStartBtnCode')}
                </Link>
                <span aria-hidden className="w-px self-stretch bg-line" />
                <Link to="/developer?method=code" className={devGroupBtn}>
                  <CodeIcon />
                  {t('homeStartBtnCode2')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
