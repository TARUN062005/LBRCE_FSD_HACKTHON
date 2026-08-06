import { useState } from 'react'

const PLANS = ['basic', 'standard', 'premium']

export default function TenantForm({ sites, initial, onSubmit, onCancel, submitting }) {
  const [companyName, setCompanyName] = useState(initial?.companyName || '')
  const [billingPlan, setBillingPlan] = useState(initial?.billingPlan || 'standard')
  const [siteId, setSiteId] = useState(initial?.siteId || sites[0]?.id || '')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!companyName.trim() || !siteId) {
      setError('Company name and site are required')
      return
    }
    try {
      await onSubmit({
        companyName: companyName.trim(),
        billingPlan,
        siteId,
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save tenant')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Company name" id="tenant-name">
        <input
          id="tenant-name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          disabled={submitting}
          className={inputClass}
          placeholder="Acme Fleet Co."
          required
        />
      </Field>
      <Field label="Billing plan" id="tenant-plan">
        <select
          id="tenant-plan"
          value={billingPlan}
          onChange={(e) => setBillingPlan(e.target.value)}
          disabled={submitting}
          className={inputClass}
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Assigned site" id="tenant-site">
        <select
          id="tenant-site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          disabled={submitting || !sites.length}
          className={inputClass}
          required
        >
          {!sites.length && <option value="">No sites available</option>}
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm dark:border-border-dark"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !sites.length}
          className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save tenant'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, id, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink dark:text-white">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-border bg-panel px-3 py-2.5 text-sm text-ink outline-none ring-accent focus:ring-2 disabled:opacity-60 dark:border-border-dark dark:bg-surface-dark dark:text-white'
