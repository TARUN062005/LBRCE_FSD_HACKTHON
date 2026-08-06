import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Animates a number from 0 (or previous) to `value`.
 */
export default function AnimatedCounter({
  value = 0,
  decimals = 0,
  duration = 1.1,
  suffix = '',
  prefix = '',
  className = '',
}) {
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(reduceMotion ? value : 0)

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value)
      return undefined
    }

    const start = display
    const end = Number(value) || 0
    const startAt = performance.now()
    const ms = duration * 1000
    let frame

    function tick(now) {
      const t = Math.min(1, (now - startAt) / ms)
      const eased = 1 - (1 - t) ** 3
      setDisplay(start + (end - start) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate on value change only
  }, [value, duration, reduceMotion])

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()

  return (
    <motion.span
      className={className}
      key={String(value)}
      initial={reduceMotion ? false : { opacity: 0.6, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {prefix}
      {formatted}
      {suffix}
    </motion.span>
  )
}
