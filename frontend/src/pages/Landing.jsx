import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import ChargingIllustration from '../components/landing/ChargingIllustration'
import ThemeToggle from '../components/ThemeToggle'
import AnimatedCounter from '../components/AnimatedCounter'
import { useAuth } from '../context/AuthContext'

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
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
    title: 'Grid-aware allocation',
    body: 'Hard site kW caps with scoring for urgency, SLA priority, and live tariff bands.',
  },
  {
    title: 'Multi-tenant fleets',
    body: 'Vehicles, sessions, and invoices isolated per company — JWT-scoped, never client-trusted.',
  },
  {
    title: 'Live session board',
    body: 'Socket.IO moves sessions through Queued → Charging → Optimized → Throttled in real time.',
  },
  {
    title: 'Transparent billing',
    body: 'Metered kWh × tariff rate rolls into open monthly invoices tenants can audit.',
  },
]

const STEPS = [
  { n: '01', title: 'Configure the site', body: 'Set capacity, chargers, and tenant companies.' },
  { n: '02', title: 'Register the fleet', body: 'Add drivers, battery size, priority, departure.' },
  { n: '03', title: 'Simulate plug-in', body: 'Optimizer reallocates power every simulator tick.' },
  { n: '04', title: 'Bill & notify', body: 'Completions invoice energy; throttles raise alerts.' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    blurb: 'Hackathon demo — full optimizer, one site.',
    perks: ['3 chargers', '2 tenants', 'Live board', 'Basic billing'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Fleet',
    price: '$249',
    blurb: 'For depots running concurrent shifts.',
    perks: ['Unlimited vehicles', 'Peak tariff awareness', 'SLA priorities', 'Admin analytics'],
    cta: 'View Demo',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    blurb: 'Multi-site grid coordination (demo).',
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
    quote: 'The live board made the optimizer explainable for judges and drivers alike.',
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
  const demoTo = isAuthenticated ? '/admin' : '/login'

  return (
    <div className="theme-surface min-h-screen overflow-x-hidden bg-surface text-ink dark:bg-surface-dark dark:text-slate-100">
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-border/80 bg-white/75 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-border-dark dark:bg-[#070b10]/80'
            : 'border-b border-transparent bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 xs:px-5 md:px-6">
          <a href="#top" className="font-display text-lg font-bold tracking-tight xs:text-xl">
            Route<span className="text-accent">Guardian</span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-sm text-ink-muted transition hover:bg-black/5 hover:text-ink dark:hover:bg-white/5 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to={startTo}
              className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 sm:inline-flex dark:bg-white dark:text-ink"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border lg:hidden dark:border-border-dark"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="Menu"
            >
              <span className="text-lg leading-none">☰</span>
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-border-dark dark:bg-[#070b10]/95">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className="block rounded-lg px-2 py-2.5 text-sm text-ink-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/5"
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
        className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pb-14 pt-24 md:pb-20 md:pt-28"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(13,148,136,0.22),transparent_52%),radial-gradient(ellipse_at_88%_12%,rgba(6,182,212,0.12),transparent_48%)] dark:bg-[radial-gradient(ellipse_at_15%_0%,rgba(45,212,191,0.14),transparent_50%),radial-gradient(ellipse_at_85%_8%,rgba(34,211,238,0.08),transparent_45%)]" />
          <motion.div
            className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-400/10"
            animate={reduce ? undefined : { x: [0, 24, 0], y: [0, 16, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-400/10"
            animate={reduce ? undefined : { x: [0, -20, 0], y: [0, -12, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 xs:px-5 md:grid-cols-2 md:gap-12 md:px-6">
          <motion.div
            variants={stagger}
            initial={reduce ? false : 'hidden'}
            animate="show"
            className="order-2 md:order-1"
          >
            <motion.p
              variants={fadeUp}
              className="font-display text-[2.35rem] font-bold leading-[1.05] tracking-tight text-ink xs:text-5xl md:text-6xl dark:text-white"
            >
              RouteGuardian
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 max-w-xl text-lg font-semibold leading-snug tracking-tight text-ink/85 xs:text-xl md:text-2xl dark:text-slate-100"
            >
              Smart Grid-Aware EV Fleet Charging Platform
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted xs:text-[15px]"
            >
              Depots share a hard electrical ceiling. When every vehicle plugs in at once, unmanaged
              charging trips breakers or strands SLA routes. RouteGuardian allocates limited kW in
              real time — by urgency, priority, and tariff — so fleets leave on time.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link
                to={startTo}
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(13,148,136,0.7)] transition hover:bg-accent-hover"
              >
                Get Started
              </Link>
              <Link
                to={demoTo}
                className="inline-flex items-center justify-center rounded-full border border-border bg-white/55 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:border-accent dark:border-border-dark dark:bg-white/5"
              >
                View Demo
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="order-1 md:order-2"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
          >
            <div className="glass-panel relative overflow-hidden rounded-[1.75rem] p-3 xs:p-4">
              <ChargingIllustration />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="relative border-y border-border/70 bg-white/45 py-11 backdrop-blur dark:border-border-dark dark:bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 xs:px-5 md:grid-cols-4 md:px-6">
          {[
            { label: 'Site capacity demos', value: 40, suffix: ' kW' },
            { label: 'Optimizer ticks', value: 3, suffix: 's' },
            { label: 'Priority tiers', value: 4, suffix: '' },
            { label: 'Realtime channels', value: 3, suffix: '+' },
          ].map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <p className="font-display text-3xl font-bold tracking-tight text-accent md:text-4xl">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-ink-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-18 xs:px-5 md:px-6 md:py-24">
        <motion.div
          initial={reduce ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Platform
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Built for constrained grids
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted md:text-base">
            Production-minded UX for admins and tenant managers — glass panels, live charts, and
            explainable power decisions.
          </motion.p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                variants={fadeUp}
                whileHover={reduce ? undefined : { y: -4 }}
                className="glass-panel group rounded-2xl p-6 transition"
              >
                <span className="font-display text-sm font-bold text-accent/70">0{i + 1}</span>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="border-y border-border/60 bg-gradient-to-b from-teal-50/70 to-transparent py-16 dark:border-border-dark dark:from-teal-950/25 md:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 xs:px-5 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Workflow</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
          <p className="mt-3 max-w-xl text-sm text-ink-muted md:text-base">
            Four steps from empty depot to metered, optimized charging.
          </p>
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.n}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="glass-panel rounded-2xl p-5"
              >
                <span className="font-display text-3xl font-bold text-accent/30">{step.n}</span>
                <h3 className="mt-3 font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Optimizer */}
      <section id="optimize" className="mx-auto max-w-6xl px-4 py-16 xs:px-5 md:px-6 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Engine</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Real-time optimization
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted md:text-[15px]">
              Every simulator tick (~3s), RouteGuardian re-scores active sessions by{' '}
              <span className="font-semibold text-ink dark:text-slate-100">urgency</span>,{' '}
              <span className="font-semibold text-ink dark:text-slate-100">priority tier</span>, and a{' '}
              <span className="font-semibold text-ink dark:text-slate-100">tariff factor</span>. Power
              is greedily allocated until site capacity is exhausted. Sessions below the threshold
              enter Throttled — visible on the board and pushed as notifications.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-teal-500/20 bg-[#0b1220] p-5 shadow-2xl shadow-teal-950/30 xs:p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <p className="ml-2 text-[11px] uppercase tracking-wider text-teal-300/80">
                allocatePower()
              </p>
            </div>
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
        className="border-y border-border/70 bg-white/40 py-16 dark:border-border-dark dark:bg-white/[0.02] md:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 xs:px-5 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Live</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Dashboard preview
          </h2>
          <p className="mt-3 text-sm text-ink-muted md:text-base">
            Judge-ready analytics — animated counters mirror the admin experience.
          </p>
          <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#0f1a24] to-[#0a2e2a] p-5 shadow-2xl xs:p-7">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Downtown Hub · Demo</p>
              <span className="flex items-center gap-1.5 rounded-full bg-teal-400/10 px-2.5 py-1 text-xs text-teal-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                </span>
                Live
              </span>
            </div>
            <div className="grid gap-3 xs:grid-cols-3">
              {PREVIEW_STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur"
                >
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </p>
                  {s.max ? (
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-300"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(s.value / s.max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-5 grid h-32 grid-cols-12 items-end gap-1.5">
              {[40, 55, 48, 62, 70, 58, 75, 68, 80, 72, 65, 70].map((h, i) => (
                <motion.div
                  key={i}
                  className="rounded-t-md bg-gradient-to-t from-teal-700 to-cyan-300"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.5 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 xs:px-5 md:px-6 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Pricing</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Simple demo plans
        </h2>
        <p className="mt-3 text-sm text-ink-muted">Hackathon cards — not billed.</p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <motion.article
              key={plan.name}
              whileHover={reduce ? undefined : { y: -5 }}
              className={[
                'flex flex-col rounded-2xl p-6 transition',
                plan.highlight
                  ? 'bg-accent text-white shadow-[0_24px_50px_-24px_rgba(13,148,136,0.85)]'
                  : 'glass-panel',
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
                to={plan.highlight ? demoTo : startTo}
                className={[
                  'mt-7 inline-flex justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition',
                  plan.highlight
                    ? 'bg-white text-teal-800 hover:bg-teal-50'
                    : 'bg-ink text-white hover:bg-ink/90 dark:bg-white dark:text-ink',
                ].join(' ')}
              >
                {plan.cta}
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#0b1220] py-16 text-slate-100 md:py-24">
        <div className="mx-auto max-w-6xl px-4 xs:px-5 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">Voice</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            What fleets say
          </h2>
          <p className="mt-3 text-sm text-slate-400">Dummy testimonials for demo polish.</p>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {QUOTES.map((q, i) => (
              <motion.blockquote
                key={q.name}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
              >
                <p className="text-sm leading-relaxed text-slate-200">&ldquo;{q.quote}&rdquo;</p>
                <footer className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold text-white">{q.name}</p>
                  <p className="text-xs text-slate-400">{q.role}</p>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface py-14 dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 xs:px-5 md:flex-row md:justify-between md:px-6">
          <div>
            <p className="font-display text-xl font-bold">
              Route<span className="text-accent">Guardian</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              Smart grid-aware EV fleet charging for the LBRCE FSD Hackathon.
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
              <p className="font-semibold">Demo</p>
              <Link to="/login" className="block text-ink-muted transition hover:text-accent">
                Admin portal
              </Link>
              <Link to="/login" className="block text-ink-muted transition hover:text-accent">
                Tenant portal
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-6xl px-4 text-xs text-ink-muted xs:px-5 md:px-6">
          © {new Date().getFullYear()} RouteGuardian · Hackathon demo
        </p>
      </footer>
    </div>
  )
}
