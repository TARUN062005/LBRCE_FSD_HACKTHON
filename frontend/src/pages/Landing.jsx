import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import ChargingIllustration from '../components/landing/ChargingIllustration'
import ThemeToggle from '../components/ThemeToggle'
import AnimatedCounter from '../components/AnimatedCounter'
import { useAuth } from '../context/AuthContext'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#optimize', label: 'Optimizer' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#preview', label: 'Preview' },
]

const FEATURES = [
  {
    title: 'Grid-aware allocation',
    body: 'Respect hard site kW caps while scoring urgency, SLA priority, and live tariff bands.',
  },
  {
    title: 'Multi-tenant fleets',
    body: 'Isolate vehicles, sessions, and invoices per company — JWT-scoped, never client-trusted.',
  },
  {
    title: 'Live session board',
    body: 'Socket.IO updates move vehicles through Queued → Charging → Optimized → Throttled.',
  },
  {
    title: 'Transparent billing',
    body: 'Metered kWh × tariff rate rolls into open monthly invoices tenants can audit.',
  },
]

const STEPS = [
  { n: '01', title: 'Configure the site', body: 'Admins set capacity, chargers, and tenant companies.' },
  { n: '02', title: 'Register the fleet', body: 'Managers add drivers, battery size, priority, and departure.' },
  { n: '03', title: 'Simulate plug-in', body: 'Sessions start; the optimizer reallocates every simulator tick.' },
  { n: '04', title: 'Bill & notify', body: 'Completions invoice energy; throttles raise in-app alerts.' },
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
    blurb: 'Multi-site grid coordination (demo card).',
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
    quote: 'The live board made the optimizer explainable for our judges and drivers alike.',
    name: 'Chris Patel',
    role: 'Platform Lead, ChargeWorks',
  },
  {
    quote: 'Tariff-aware throttling cut our peak spend without missing SLA departures.',
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
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const startTo = isAuthenticated ? homePath : '/login'
  const demoTo = isAuthenticated ? '/admin' : '/login'

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-[#f7faf9] text-slate-900 dark:bg-[#070b10] dark:text-slate-100">
      {/* Nav */}
      <header
        className={[
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-white/10 bg-white/70 shadow-sm backdrop-blur-xl dark:bg-[#070b10]/75'
            : 'bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 xs:px-5 md:px-6">
          <a href="#top" className="font-display text-lg font-bold tracking-tight xs:text-xl">
            Route<span className="text-teal-600 dark:text-teal-400">Guardian</span>
          </a>
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-slate-600 transition hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to={startTo}
              className="hidden rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex dark:bg-white dark:text-slate-900"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 lg:hidden dark:border-slate-700"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-[#070b10]/95">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className="block py-2 text-sm"
              >
                {item.label}
              </a>
            ))}
            <Link to={startTo} className="mt-2 block py-2 text-sm font-semibold text-teal-700">
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>
          </div>
        )}
      </header>

      {/* Hero — full-bleed gradient + illustration */}
      <section
        id="top"
        className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-10 pt-24 md:justify-center md:pb-16 md:pt-28"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(20,184,166,0.28),transparent_55%),radial-gradient(ellipse_at_90%_20%,rgba(6,182,212,0.18),transparent_50%),linear-gradient(180deg,#ecfdf8_0%,#f7faf9_45%,#f7faf9_100%)] dark:bg-[radial-gradient(ellipse_at_15%_0%,rgba(20,184,166,0.22),transparent_50%),radial-gradient(ellipse_at_85%_10%,rgba(34,211,238,0.12),transparent_45%),linear-gradient(180deg,#070b10_0%,#0a1218_55%,#070b10_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 xs:px-5 md:grid-cols-2 md:gap-10 md:px-6">
          <motion.div
            variants={stagger}
            initial={reduce ? false : 'hidden'}
            animate="show"
            className="order-2 md:order-1"
          >
            <motion.p
              variants={fadeUp}
              className="font-display text-3xl font-bold tracking-tight text-slate-900 xs:text-4xl md:text-5xl dark:text-white"
            >
              RouteGuardian
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-3 max-w-xl text-xl font-semibold leading-snug tracking-tight text-slate-800 xs:text-2xl md:text-3xl dark:text-slate-100"
            >
              Smart Grid-Aware EV Fleet Charging Platform
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600 xs:text-base dark:text-slate-300">
              Depots share a hard electrical ceiling. When every vehicle plugs in at once, unmanaged
              charging trips breakers or strands SLA routes. RouteGuardian allocates limited kW in
              real time — by urgency, priority, and tariff — so fleets leave on time.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-3">
              <Link
                to={startTo}
                className="inline-flex items-center justify-center rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-500"
              >
                Get Started
              </Link>
              <Link
                to={demoTo}
                className="inline-flex items-center justify-center rounded-full border border-slate-300/80 bg-white/50 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:border-teal-500 dark:border-slate-600 dark:bg-white/5"
              >
                View Demo
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="order-1 md:order-2"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <ChargingIllustration />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-slate-200/70 bg-white/40 py-12 backdrop-blur dark:border-slate-800 dark:bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 xs:px-5 md:grid-cols-4 md:px-6">
          {[
            { label: 'Site capacity demos', value: 40, suffix: ' kW' },
            { label: 'Optimizer ticks', value: 3, suffix: 's' },
            { label: 'Priority tiers', value: 4, suffix: '' },
            { label: 'Realtime channels', value: 3, suffix: '+' },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display text-3xl font-bold text-teal-700 dark:text-teal-400">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 xs:px-5 md:px-6 md:py-24">
        <motion.div
          initial={reduce ? false : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="font-display text-2xl font-bold md:text-3xl">
            Built for constrained grids
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Production-minded UX for admins and tenant managers — glass panels, live charts, and
            explainable power decisions.
          </motion.p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <motion.article
                key={f.title}
                variants={fadeUp}
                whileHover={reduce ? undefined : { y: -3 }}
                className="rounded-2xl border border-white/40 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
              >
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {f.body}
                </p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gradient-to-b from-teal-50/80 to-transparent py-16 dark:from-teal-950/30 md:py-24">
        <div className="mx-auto max-w-6xl px-4 xs:px-5 md:px-6">
          <h2 className="font-display text-2xl font-bold md:text-3xl">How it works</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Four steps from empty depot to metered, optimized charging.
          </p>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.n}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                <span className="font-display text-4xl font-bold text-teal-600/25 dark:text-teal-400/20">
                  {step.n}
                </span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Real-time optimization */}
      <section id="optimize" className="mx-auto max-w-6xl px-4 py-16 xs:px-5 md:px-6 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Real-time optimization</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Every simulator tick (~3s), RouteGuardian re-scores active sessions:
              <strong className="text-slate-800 dark:text-slate-200"> urgency</strong> (time to
              departure × remaining energy),{' '}
              <strong className="text-slate-800 dark:text-slate-200">priority tier</strong>{' '}
              (SLA → High → Medium → Low), and a{' '}
              <strong className="text-slate-800 dark:text-slate-200">tariff factor</strong> that
              softens demand in peak hours. Power is greedily allocated until site capacity is
              exhausted. Sessions below a minimum threshold enter Throttled — visible on the board
              and pushed as notifications.
            </p>
          </div>
          <div className="rounded-2xl border border-white/40 bg-slate-900 p-5 text-slate-100 shadow-xl dark:border-teal-500/20">
            <p className="text-[11px] uppercase tracking-wider text-teal-300/80">allocatePower()</p>
            <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-teal-50/90 xs:text-xs">
{`score = urgency × priorityWeight × tariffFactor
sort sessions by score (desc)
for each session:
  grant = min(remainingNeed, chargerMax, siteLeft)
  if grant < throttleFloor → Throttled
  else → Optimized / Charging
  siteLeft -= grant`}
            </pre>
          </div>
        </div>
      </section>

      {/* Live dashboard preview */}
      <section id="preview" className="border-y border-slate-200/70 bg-white/50 py-16 dark:border-slate-800 dark:bg-white/[0.02] md:py-24">
        <div className="mx-auto max-w-6xl px-4 xs:px-5 md:px-6">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Live dashboard preview</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Glassmorphism judge view — animated counters mirror the admin analytics experience.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-4 shadow-2xl xs:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Downtown Hub · Demo</p>
              <span className="flex items-center gap-1.5 text-xs text-teal-300">
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
                  className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur"
                >
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </p>
                  {s.max ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-teal-400"
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
            <div className="mt-4 grid h-28 grid-cols-12 items-end gap-1">
              {[40, 55, 48, 62, 70, 58, 75, 68, 80, 72, 65, 70].map((h, i) => (
                <motion.div
                  key={i}
                  className="rounded-t bg-gradient-to-t from-teal-600 to-cyan-300"
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
        <h2 className="font-display text-2xl font-bold md:text-3xl">Pricing</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Demo cards for the hackathon — not billed.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <motion.article
              key={plan.name}
              whileHover={reduce ? undefined : { y: -4 }}
              className={[
                'flex flex-col rounded-2xl border p-6 backdrop-blur',
                plan.highlight
                  ? 'border-teal-500/50 bg-teal-600 text-white shadow-xl shadow-teal-600/20'
                  : 'border-white/40 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]',
              ].join(' ')}
            >
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 font-display text-3xl font-bold">{plan.price}</p>
              <p
                className={[
                  'mt-2 text-sm',
                  plan.highlight ? 'text-teal-50' : 'text-slate-600 dark:text-slate-400',
                ].join(' ')}
              >
                {plan.blurb}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {plan.perks.map((p) => (
                  <li key={p}>✓ {p}</li>
                ))}
              </ul>
              <Link
                to={plan.highlight ? demoTo : startTo}
                className={[
                  'mt-6 inline-flex justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition',
                  plan.highlight
                    ? 'bg-white text-teal-800 hover:bg-teal-50'
                    : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900',
                ].join(' ')}
              >
                {plan.cta}
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900 py-16 text-slate-100 md:py-24">
        <div className="mx-auto max-w-6xl px-4 xs:px-5 md:px-6">
          <h2 className="font-display text-2xl font-bold md:text-3xl">What fleets say</h2>
          <p className="mt-2 text-sm text-slate-400">Dummy testimonials for demo polish.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {QUOTES.map((q, i) => (
              <motion.blockquote
                key={q.name}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <p className="text-sm leading-relaxed text-slate-200">&ldquo;{q.quote}&rdquo;</p>
                <footer className="mt-4">
                  <p className="text-sm font-semibold">{q.name}</p>
                  <p className="text-xs text-slate-400">{q.role}</p>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#f7faf9] py-12 dark:border-slate-800 dark:bg-[#070b10]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 xs:px-5 md:flex-row md:justify-between md:px-6">
          <div>
            <p className="font-display text-lg font-bold">
              Route<span className="text-teal-600 dark:text-teal-400">Guardian</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              Smart grid-aware EV fleet charging for the LBRCE FSD Hackathon.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-sm">
            <div className="space-y-2">
              <p className="font-semibold">Product</p>
              <a href="#features" className="block text-slate-500 hover:text-teal-600">
                Features
              </a>
              <a href="#pricing" className="block text-slate-500 hover:text-teal-600">
                Pricing
              </a>
              <Link to="/login" className="block text-slate-500 hover:text-teal-600">
                Sign in
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">Demo</p>
              <Link to="/login" className="block text-slate-500 hover:text-teal-600">
                Admin portal
              </Link>
              <Link to="/login" className="block text-slate-500 hover:text-teal-600">
                Tenant portal
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-4 text-xs text-slate-400 xs:px-5 md:px-6">
          © {new Date().getFullYear()} RouteGuardian · Hackathon demo · Not a commercial offer
        </p>
      </footer>
    </div>
  )
}
