import { useEffect, useState } from 'react'
import { subscribeSocketStatus } from '../lib/socket'

export default function ConnectionStatusBanner() {
  const [status, setStatus] = useState('connected')

  useEffect(() => subscribeSocketStatus(setStatus), [])

  if (status === 'connected') return null

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 border-b border-amber-300/80 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
    >
      Live connection lost — reconnecting. Session board may be stale until the socket recovers.
    </div>
  )
}
