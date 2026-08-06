import { useEffect, useState } from 'react'
import { formatMoney } from '../lib/money'

const METHODS = [
  { id: 'upi', label: 'UPI', hint: 'GPay · PhonePe · Paytm' },
  { id: 'card', label: 'Card', hint: 'Visa · Mastercard · RuPay' },
  { id: 'netbanking', label: 'Net Banking', hint: 'All major banks' },
  { id: 'wallet', label: 'Wallet', hint: 'Paytm · Amazon Pay' },
]

/**
 * Demo Razorpay-style checkout modal — no real money / KYC.
 */
export default function RazorpayDemoModal({
  open,
  onClose,
  onDismiss,
  onSuccess,
  onCancel,
  amount = 0,
  userName = '',
  userEmail = '',
  stationName = '',
  summaryLines = [],
}) {
  const [method, setMethod] = useState('upi')
  const [phase, setPhase] = useState('checkout') // checkout | loading | success | cancelled | error
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!open) {
      setPhase('checkout')
      setMethod('upi')
      setBusy(false)
      setErrorMsg('')
      return undefined
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  function dismissOnly() {
    if (typeof onDismiss === 'function') onDismiss()
    else onClose?.()
  }

  function closeSoft() {
    if (phase === 'success') onClose?.()
    else dismissOnly()
  }

  async function payNow() {
    setBusy(true)
    setErrorMsg('')
    setPhase('loading')
    await new Promise((r) => setTimeout(r, 2000))
    try {
      await onSuccess?.(method)
      setPhase('success')
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Payment failed')
      setPhase('error')
      setBusy(false)
    }
  }

  async function cancelPay() {
    setPhase('cancelled')
    try {
      await onCancel?.(method)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[3px] transition-opacity"
        aria-label="Close payment"
        onClick={() => {
          if (phase === 'loading') return
          if (phase === 'checkout') cancelPay()
          else closeSoft()
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md animate-[fadeIn_0.2s_ease] overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Razorpay-like header */}
        <div className="flex items-center justify-between bg-[#072654] px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2b84ea] text-sm font-black shadow-sm">
              Rz
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">Razorpay</p>
              <p className="text-[10px] uppercase tracking-wider text-sky-200/80">
                GridFleet · Demo
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-sky-200/70">Amount</p>
            <p className="font-semibold tabular-nums">{formatMoney(amount)}</p>
          </div>
        </div>

        {phase === 'checkout' && (
          <div className="space-y-4 p-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{stationName || 'GridFleet charging'}</p>
              <p className="mt-1 text-slate-600">{userName || 'Customer'}</p>
              <p className="text-xs text-slate-500">{userEmail || '—'}</p>
              {summaryLines?.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-slate-200 pt-2 text-xs text-slate-600">
                  {summaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment method
              </p>
              <div className="grid gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={[
                      'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition',
                      method === m.id
                        ? 'border-[#2b84ea] bg-sky-50 ring-1 ring-[#2b84ea]/40'
                        : 'border-slate-200 hover:border-slate-300',
                    ].join(' ')}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                      <span className="text-xs text-slate-500">{m.hint}</span>
                    </span>
                    <span
                      className={[
                        'h-4 w-4 rounded-full border-2',
                        method === m.id ? 'border-[#2b84ea] bg-[#2b84ea]' : 'border-slate-300',
                      ].join(' ')}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={cancelPay}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-[1.4] rounded-xl bg-[#2b84ea] py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#1f6fd0]"
                onClick={payNow}
                disabled={busy}
              >
                Pay Now
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400">
              Demo only · No real money · No KYC · Fake Razorpay IDs
            </p>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-100 border-t-[#2b84ea]" />
            <p className="text-sm font-semibold text-slate-800">Processing payment…</p>
            <p className="text-xs text-slate-500">Securing your demo transaction</p>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600 animate-[bounce_0.6s_ease]">
              ✓
            </div>
            <p className="text-lg font-bold text-slate-900">Payment Successful</p>
            <p className="text-sm text-slate-600">
              Your booking request has been sent to the station owner.
            </p>
            <button
              type="button"
              className="mt-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
              onClick={() => onClose?.()}
            >
              Done
            </button>
          </div>
        )}

        {phase === 'cancelled' && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-500">
              ×
            </div>
            <p className="text-lg font-bold text-slate-900">Payment cancelled</p>
            <p className="text-sm text-slate-600">No booking was created.</p>
            <button
              type="button"
              className="mt-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
              onClick={dismissOnly}
            >
              Close
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-600">
              !
            </div>
            <p className="text-lg font-bold text-slate-900">Payment failed</p>
            <p className="text-sm text-slate-600">{errorMsg || 'Something went wrong. Try again.'}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                onClick={dismissOnly}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#2b84ea] px-4 py-2.5 text-sm font-semibold text-white"
                onClick={() => {
                  setPhase('checkout')
                  setBusy(false)
                }}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
