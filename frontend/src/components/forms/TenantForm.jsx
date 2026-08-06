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
          className="ui-btn ui-btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !sites.length}
          className="ui-btn ui-btn-primary flex-1"
        >
          {submitting ? 'Saving…' : 'Save tenant'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="ui-label">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'ui-input'
