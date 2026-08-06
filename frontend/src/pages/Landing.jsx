import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import ChargingIllustration from '../components/landing/ChargingIllustration'
import ThemeToggle from '../components/ThemeToggle'
import AnimatedCounter from '../components/AnimatedCounter'
import { useAuth } from '../context/AuthContext'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#optimize', label: 'Optimizer' },
  { href: '#preview', label: 'Preview' },
  { href: '#pricing', label: 'Pricing' },
]

const FEATURES = [
  {
    title: 'Live optimization',
    body: 'Hard site kW caps with scoring for urgency, SLA priority, and live tariff bands.',
  },
  {
    title: 'Multi-tenant billing',
    body: 'Vehicles, sessions, and invoices stay isolated per company — never trusted from the client.',
  },
  {
    title: 'Real-time session tracking',
    body: 'Socket.IO moves sessions through Queued → Charging → Optimized → Throttled live.',
  },
  {
    title: 'Notifications',
    body: 'Throttle and completion events surface as in-app alerts for operators and drivers.',
  },
]

const STEPS = [
  { n: '01', title: 'Driver plugs in', body: 'A vehicle connects and enters the live session board.' },
  { n: '02', title: 'Optimizer allocates power', body: 'Urgency, priority, and tariff decide how kW is shared.' },
  { n: '03', title: 'Live dashboard updates', body: 'Operators see state and power changes in real time.' },
  { n: '04', title: 'Session ends', body: 'Energy delivered is finalized when charging completes.' },
  { n: '05', title: 'Tenant billed', body: 'Metered kWh rolls into the open invoice for the fleet.' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    blurb: 'Full optimizer on a single site.',
    perks: ['3 chargers', '2 tenants', 'Live board', 'Basic billing'],
    cta: 'Get started',
    highlight: false,
  },
  {
    name: 'Fleet',
    price: '$249',
    blurb: 'For depots running concurrent shifts.',
    perks: ['Unlimited vehicles', 'Peak tariff awareness', 'SLA priorities', 'Admin analytics'],
    cta: 'Sign in',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    blurb: 'Multi-site grid coordination.',
    perks: ['Multi-site', 'SSO & audit', 'Custom SLAs', 'Dedicated support'],
    cta: 'Contact',
    highlight: false,
  },
]

const QUOTES = [
  {
    quote: 'We finally see who gets power when the depot hits the ceiling — and why.',
    name: 'Maya Okonkwo',
    role: 'Fleet Ops, Northline Logistics',
  },
  {
    quote: 'The live board made the optimizer explainable for operators and drivers alike.',
    name: 'Chris Patel',
    role: 'Platform Lead, ChargeWorks',
  },
  {
    quote: 'Tariff-aware throttling cut peak spend without missing SLA departures.',
    name: 'Elena Ruiz',
    role: 'Energy Manager, Metro Transit',
  },
]

const PREVIEW_STATS = [
  { label: 'Grid used', value: 28, suffix: ' kW', max: 40 },
  { label: 'Active sessions', value: 3, suffix: '' },
  { label: 'Utilization', value: 70, suffix: '%' },
]

export default function Landing() {
  const { isAuthenticated, homePath } = useAuth()
  const reduce = useReducedMotion()
  const [navOpen, setNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const startTo = isAuthenticated ? homePath : '/login'

  return (
    <div className="theme-surface min-h-screen overflow-x-hidden bg-surface text-ink dark:bg-surface-dark dark:text-slate-100">
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-border/90 bg-panel/90 shadow-[var(--shadow-sm)] backdrop-blur-md dark:border-border-dark dark:bg-panel-dark/90'
            : 'border-b border-transparent bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 xs:px-5 md:px-8">
          <a href="#top" className="font-display text-lg font-bold tracking-tight">
            Grid<span className="text-accent">Fleet</span>
          </a>
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Landing">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to={startTo}
              className="ui-btn ui-btn-primary hidden !rounded-lg sm:inline-flex"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>
            <button
              type="button"
              className="ui-btn ui-btn-secondary inline-flex h-9 w-9 !p-0 lg:hidden"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={navOpen}
            >
              <span aria-hidden>☰</span>
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="border-t border-border bg-panel px-4 py-3 lg:hidden dark:border-border-dark dark:bg-panel-dark">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className="block rounded-lg px-2 py-2.5 text-sm text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.06]"
              >
                {item.label}
              </a>
            ))}
            <Link
              to={startTo}
              className="mt-1 block rounded-lg px-2 py-2.5 text-sm font-semibold text-accent"
              onClick={() => setNavOpen(false)}
            >
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        id="top"
        className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pb-16 pt-24 md:pb-20 md:pt-28"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(15,118,110,0.09),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_20%_0%,rgba(45,212,191,0.08),transparent_50%)]" />

        <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-12 px-4 xs:px-5 md:grid-cols-2 md:gap-14 md:px-8">
          <motion.div
            variants={stagger}
            initial={reduce ? false : 'hidden'}
            animate="show"
            className="order-2 md:order-1"
          >
            <motion.p
              variants={fadeUp}
              className="font-display text-[2.4rem] font-bold leading-[1.05] tracking-tight text-ink xs:text-5xl md:text-[3.25rem] dark:text-white"
            >
              GridFleet
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 max-w-xl text-lg font-semibold leading-snug tracking-tight text-ink/80 xs:text-xl md:text-2xl dark:text-slate-200"
            >
              Grid-aware multi-tenant EV fleet charging orchestration
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted"
            >
              Depots share a hard electrical ceiling. GridFleet allocates limited kW in real time —
              by urgency, priority, and tariff — so fleets leave on time.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link to={startTo} className="ui-btn ui-btn-primary !px-6 !py-3">
                Continue with Google
              </Link>
              <a href="#how" className="ui-btn ui-btn-secondary !px-6 !py-3">
                How it works
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            className="order-1 md:order-2"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
          >
            <div className="ui-card overflow-hidden p-3 xs:p-4">
              <ChargingIllustration />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-panel py-12 dark:border-border-dark dark:bg-panel-dark">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 px-4 xs:px-5 md:grid-cols-4 md:px-8">
          {[
            { label: 'Site capacity', value: 40, suffix: ' kW' },
            { label: 'Active sessions', value: 3, suffix: '' },
            { label: 'Chargers online', value: 3, suffix: '' },
            { label: 'Tenants onboarded', value: 2, suffix: '' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{s.label}</p>
              <p className="stat-value mt-1 text-ink dark:text-white">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1400px] px-4 py-16 xs:px-5 md:px-8 md:py-24">
        <p className="section-title">Features</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Built for constrained depots
        </h2>
        <p className="mt-3 max-w-xl text-sm text-ink-muted md:text-[15px]">
          Everything operators need when every charger wants power at once.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="ui-card ui-card-hover flex h-full flex-col p-5"
            >
              <h3 className="text-base font-semibold text-ink dark:text-white">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{f.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="border-y border-border bg-panel py-16 dark:border-border-dark dark:bg-panel-dark md:py-24"
      >
        <div className="mx-auto max-w-[1400px] px-4 xs:px-5 md:px-8">
          <p className="section-title">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            From plug-in to invoice
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {STEPS.map((step) => (
              <li key={step.n} className="ui-card flex h-full flex-col p-4">
                <span className="font-display text-sm font-bold text-accent">{step.n}</span>
                <h3 className="mt-2 text-sm font-semibold text-ink dark:text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Optimizer */}
      <section id="optimize" className="mx-auto max-w-[1400px] px-4 py-16 xs:px-5 md:px-8 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="section-title">Engine</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Real-time optimization
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted md:text-[15px]">
              Every simulator tick, GridFleet re-scores active sessions by urgency, priority tier,
              and tariff factor — then greedily allocates power until site capacity is exhausted.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-ink p-5 shadow-[var(--shadow-md)] dark:border-border-dark xs:p-6">
            <p className="mb-3 text-[11px] uppercase tracking-wider text-teal-300/80">
              allocatePower()
            </p>
            <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-teal-50/90 xs:text-xs">
{`score = urgency × priorityWeight × tariffFactor
sort sessions by score (desc)
for each session:
  grant = min(need, chargerMax, siteLeft)
  if grant < throttleFloor → Throttled
  else → Optimized / Charging
  siteLeft -= grant`}
            </pre>
          </div>
        </div>
      </section>

      {/* Preview */}
      <section
        id="preview"
        className="border-y border-border bg-panel py-16 dark:border-border-dark dark:bg-panel-dark md:py-24"
      >
        <div className="mx-auto max-w-[1400px] px-4 xs:px-5 md:px-8">
          <p className="section-title">Preview</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Dashboard at a glance
          </h2>
          <p className="mt-3 text-sm text-ink-muted">Illustrative metrics — same layout as analytics.</p>
          <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-ink p-5 shadow-[var(--shadow-lg)] xs:p-7 dark:border-border-dark">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Downtown Hub</p>
              <span className="flex items-center gap-1.5 rounded-md bg-teal-400/10 px-2.5 py-1 text-xs text-teal-300">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400" aria-hidden />
                Live
              </span>
            </div>
            <div className="grid gap-3 xs:grid-cols-3">
              {PREVIEW_STATS.map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </p>
                  {s.max ? (
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-teal-400"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(s.value / s.max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1400px] px-4 py-16 xs:px-5 md:px-8 md:py-24">
        <p className="section-title">Pricing</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Simple plans
        </h2>
        <p className="mt-3 text-sm text-ink-muted">Illustrative — not billed in this build.</p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={[
                'flex h-full flex-col rounded-2xl p-6',
                plan.highlight
                  ? 'bg-accent text-white shadow-[var(--shadow-md)]'
                  : 'ui-card',
              ].join(' ')}
            >
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <p className="mt-3 font-display text-4xl font-bold tracking-tight">{plan.price}</p>
              <p className={['mt-2 text-sm', plan.highlight ? 'text-teal-50' : 'text-ink-muted'].join(' ')}>
                {plan.blurb}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.perks.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className={plan.highlight ? 'text-teal-100' : 'text-accent'}>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                to={startTo}
                className={[
                  'mt-7 inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                  plan.highlight
                    ? 'bg-white text-teal-900 hover:bg-teal-50'
                    : 'bg-ink text-white hover:bg-ink/90 dark:bg-white dark:text-ink',
                ].join(' ')}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-ink py-16 text-slate-100 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 xs:px-5 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-400">Voice</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            What fleets say
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {QUOTES.map((q) => (
              <blockquote
                key={q.name}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <p className="flex-1 text-sm leading-relaxed text-slate-200">
                  &ldquo;{q.quote}&rdquo;
                </p>
                <footer className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-white">{q.name}</p>
                  <p className="text-xs text-slate-400">{q.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-panel py-14 dark:border-border-dark dark:bg-panel-dark">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 xs:px-5 md:flex-row md:justify-between md:px-8">
          <div>
            <p className="font-display text-xl font-bold">
              Grid<span className="text-accent">Fleet</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              Grid-Aware Multi-Tenant EV Fleet Charging Orchestration Platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-12 text-sm">
            <div className="space-y-2.5">
              <p className="font-semibold">Product</p>
              <a href="#features" className="block text-ink-muted transition hover:text-accent">
                Features
              </a>
              <a href="#pricing" className="block text-ink-muted transition hover:text-accent">
                Pricing
              </a>
              <Link to="/login" className="block text-ink-muted transition hover:text-accent">
                Sign in
              </Link>
            </div>
            <div className="space-y-2.5">
              <p className="font-semibold">Access</p>
              <Link to="/login" className="block text-ink-muted transition hover:text-accent">
                Continue with Google
              </Link>
              <a href="#how" className="block text-ink-muted transition hover:text-accent">
                How it works
              </a>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-[1400px] px-4 text-xs text-ink-muted xs:px-5 md:px-8">
          © {new Date().getFullYear()} GridFleet
        </p>
      </footer>
    </div>
  )
}
