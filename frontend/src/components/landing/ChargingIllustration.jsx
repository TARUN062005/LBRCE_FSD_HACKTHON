import { motion } from 'framer-motion'

/** Animated EV + charger graphic for the landing hero */
export default function ChargingIllustration({ className = '' }) {
  return (
    <div
      className={`relative mx-auto aspect-[4/3] w-full max-w-xl select-none ${className}`}
      aria-hidden
    >
      {/* Soft glow plane */}
      <motion.div
        className="absolute inset-[12%] rounded-[40%] bg-gradient-to-tr from-teal-400/30 via-cyan-300/20 to-transparent blur-2xl"
        animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg viewBox="0 0 480 360" className="relative h-full w-full drop-shadow-2xl">
        <defs>
          <linearGradient id="stationBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground */}
        <ellipse cx="240" cy="318" rx="168" ry="14" fill="currentColor" opacity="0.08" />

        {/* Charging station */}
        <rect x="78" y="120" width="64" height="170" rx="12" fill="url(#stationBody)" />
        <rect x="88" y="138" width="44" height="52" rx="8" fill="#0f172a" stroke="#2dd4bf" strokeWidth="2" />
        <motion.rect
          x="96"
          y="148"
          width="28"
          height="8"
          rx="2"
          fill="#2dd4bf"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <motion.rect
          x="96"
          y="162"
          width="20"
          height="8"
          rx="2"
          fill="#5eead4"
          animate={{ opacity: [0.25, 0.9, 0.25] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
        />
        <circle cx="110" cy="210" r="10" fill="#134e4a" stroke="#2dd4bf" strokeWidth="2" />

        {/* Cable */}
        <motion.path
          d="M142 220 C 180 250, 210 200, 248 228"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="5"
          strokeLinecap="round"
          initial={{ pathLength: 0.85 }}
          animate={{ d: [
            'M142 220 C 180 250, 210 200, 248 228',
            'M142 220 C 176 240, 214 210, 248 228',
            'M142 220 C 180 250, 210 200, 248 228',
          ] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* EV silhouette */}
        <g transform="translate(220, 190)">
          <path
            d="M20 70 C 28 40, 50 28, 90 26 L 150 26 C 190 28, 210 42, 222 70 L 236 70 L 236 92 L 8 92 L 8 70 Z"
            fill="url(#carBody)"
          />
          <path d="M70 30 L 130 30 L 145 58 L 55 58 Z" fill="#ccfbf1" opacity="0.35" />
          <circle cx="55" cy="92" r="16" fill="#0f172a" />
          <circle cx="55" cy="92" r="8" fill="#64748b" />
          <circle cx="195" cy="92" r="16" fill="#0f172a" />
          <circle cx="195" cy="92" r="8" fill="#64748b" />
          {/* Charge port glow */}
          <motion.circle
            cx="28"
            cy="62"
            r="6"
            fill="#5eead4"
            filter="url(#softGlow)"
            animate={{ opacity: [0.4, 1, 0.4], r: [5, 7, 5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </g>

        {/* Energy bolts */}
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d="M300 80 L 288 112 L 308 112 L 292 150"
            fill="url(#bolt)"
            filter="url(#softGlow)"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 0], y: [12, -8, -28] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.45,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Grid pulse ring */}
        <motion.circle
          cx="110"
          cy="210"
          r="22"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="1.5"
          animate={{ r: [18, 34], opacity: [0.55, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      </svg>
    </div>
  )
}
