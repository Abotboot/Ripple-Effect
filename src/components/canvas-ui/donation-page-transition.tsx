'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DonationPageTransitionProps {
  children: React.ReactNode
  origin?: { x: number; y: number } | null
}

const RIPPLE_DURATION = 0.85

export function DonationPageTransition({
  children,
  origin,
}: DonationPageTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [coords, setCoords] = useState({ x: '80%', y: '40px' })

  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(isReduced)

    if (isReduced) {
      setIsAnimating(false)
      return
    }

    if (origin && typeof origin.x === 'number' && typeof origin.y === 'number') {
      setCoords({ x: `${Math.round(origin.x)}px`, y: `${Math.round(origin.y)}px` })
    } else if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768
      setCoords({
        x: isMobile ? '50%' : `${Math.round(window.innerWidth * 0.78)}px`,
        y: isMobile ? '35px' : '40px',
      })
    }

    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, RIPPLE_DURATION * 1000)

    return () => clearTimeout(timer)
  }, [origin])

  if (reducedMotion) {
    return <div className="w-full">{children}</div>
  }

  const { x, y } = coords

  return (
    <div className="relative w-full overflow-hidden">
      {/* The Page Content: Revealed organically in the wake of the expanding ripple */}
      <motion.div
        className="w-full"
        initial={{
          clipPath: `circle(0px at ${x} ${y})`,
        }}
        animate={{
          clipPath: [
            `circle(0px at ${x} ${y})`,
            `circle(160vmax at ${x} ${y})`,
          ],
        }}
        transition={{
          duration: RIPPLE_DURATION,
          ease: [0.22, 1, 0.36, 1], // Smooth snappy cubic-bezier ease-out
        }}
        style={!isAnimating ? { clipPath: 'none' } : undefined}
      >
        {children}
      </motion.div>

      {/* Ripple Rings Originating Directly from Donate */}
      <AnimatePresence>
        {isAnimating && (
          <div
            key="donate-ripple-container"
            className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
            aria-hidden="true"
          >
            {/* Wave 1: Primary refractive water ripple crest */}
            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400/90 shadow-[0_0_35px_rgba(56,189,248,0.5),inset_0_0_20px_rgba(244,63,94,0.3)]"
              style={{ left: x, top: y }}
              initial={{ width: 0, height: 0, opacity: 1 }}
              animate={{
                width: ['0vmax', '240vmax'],
                height: ['0vmax', '240vmax'],
                opacity: [1, 0.85, 0],
              }}
              transition={{
                duration: RIPPLE_DURATION,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            {/* Wave 2: Secondary liquid ripple wave */}
            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-400/70 shadow-[0_0_25px_rgba(244,63,94,0.4)]"
              style={{ left: x, top: y }}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{
                width: ['0vmax', '210vmax'],
                height: ['0vmax', '210vmax'],
                opacity: [0.8, 0.5, 0],
              }}
              transition={{
                delay: 0.08,
                duration: RIPPLE_DURATION - 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            />

            {/* Wave 3: Soft ambient trailing ripple */}
            <motion.div
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/40"
              style={{ left: x, top: y }}
              initial={{ width: 0, height: 0, opacity: 0.6 }}
              animate={{
                width: ['0vmax', '180vmax'],
                height: ['0vmax', '180vmax'],
                opacity: [0.6, 0.3, 0],
              }}
              transition={{
                delay: 0.15,
                duration: RIPPLE_DURATION - 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
