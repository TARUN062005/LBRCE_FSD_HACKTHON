import { useEffect } from 'react'
import Button from './ui/Button'

/** Mobile-friendly modal / bottom-sheet. Logic unchanged — visual restyle only. */
export default function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] dark:bg-black/55"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-panel p-5 shadow-[var(--shadow-lg)] sm:max-w-md sm:rounded-2xl dark:border-border-dark dark:bg-panel-dark"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="font-display text-lg font-semibold tracking-tight text-ink dark:text-white">
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose} className="!px-2 !py-1 text-xs" aria-label="Close">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
