'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Droplets } from 'lucide-react'

// Timing configuration in seconds
const DROP_FALL_DURATION = 0.55
const SPLASH_START = 0.52
const EXPAND_DURATION = 0.85
const TOTAL_DURATION = 1.6

interface RippleWave {
  id: number
  delay: number
  maxSize: number
  color: string
}

const RIPPLE_WAVES: RippleWave[] = [
  { id: 1, delay: 0.0, maxSize: 1600, color: 'border-cyan-300/80 shadow-[0_0_30px_rgba(103,232,249,0.6)]' },
  { id: 2, delay: 0.12, maxSize: 1300, color: 'border-rose-300/70 shadow-[0_0_25px_rgba(253,164,175,0.5)]' },
  { id: 3, delay: 0.26, maxSize: 1000, color: 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.4)]' },
  { id: 4, delay: 0.42, maxSize: 750, color: 'border-pink-400/50 shadow-[0_0_15px_rgba(244,114,182,0.3)]' },
]

export function DonationPageTransition({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAnimating, setIsAnimating] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(isReduced)

    if (isReduced) {
      setIsAnimating(false)
      return
    }

    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, TOTAL_DURATION * 1000)

    return () => clearTimeout(timer)
  }, [])

  if (reducedMotion) {
    return <div className="w-full">{children}</div>
  }

  return (
    <div className="relative w-full overflow-hidden">
      {/* The Page Content - revealed via expanding radial clip-path */}
      <motion.div
        className="w-full"
        initial={{
          clipPath: 'circle(0% at 50% 32%)',
          opacity: 0.85,
          scale: 0.98,
        }}
        animate={{
          clipPath: [
            'circle(0% at 50% 32%)',
            'circle(0% at 50% 32%)',
            'circle(160% at 50% 32%)',
          ],
          opacity: [0.85, 0.9, 1],
          scale: [0.98, 0.99, 1],
        }}
        transition={{
          times: [0, SPLASH_START / TOTAL_DURATION, 1],
          duration: TOTAL_DURATION,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>

      {/* Water Ripple & Splash Transition Overlay */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            key="water-transition-overlay"
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
            aria-hidden="true"
          >
            {/* Ambient liquid backdrop flash */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-sky-900/40 via-cyan-950/20 to-transparent backdrop-blur-[2px]"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: [0.9, 1, 0] }}
              transition={{
                times: [0, SPLASH_START, 1],
                duration: TOTAL_DURATION,
                ease: 'easeInOut',
              }}
            />

            {/* Impact Center Ambient Glow */}
            <motion.div
              className="absolute left-1/2 top-[32%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/40 blur-3xl"
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{
                scale: [0.1, 0.2, 3.5, 4.5],
                opacity: [0, 0, 0.75, 0],
              }}
              transition={{
                times: [0, SPLASH_START - 0.05, SPLASH_START + 0.1, 1],
                duration: TOTAL_DURATION,
                ease: 'easeOut',
              }}
            />

            {/* Falling 3D Glass Water Droplet */}
            <motion.div
              className="absolute left-1/2"
              initial={{
                x: '-50%',
                y: '-10vh',
                scale: 0.8,
                opacity: 0,
              }}
              animate={{
                x: '-50%',
                y: ['-10vh', '32vh'],
                scale: [0.8, 1, 1, 0.2],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                times: [0, 0.15, 0.92, 1],
                duration: DROP_FALL_DURATION,
                ease: [0.45, 0, 0.55, 1],
              }}
            >
              {/* Droplet visual */}
              <div className="relative h-14 w-14 -translate-y-1/2">
                {/* Droplet streak trail */}
                <div className="absolute -top-16 left-1/2 h-20 w-1 -translate-x-1/2 rounded-full bg-gradient-to-t from-cyan-300/80 to-transparent blur-[1px]" />

                {/* 3D sphere with reflections */}
                <div className="h-full w-full rounded-full bg-gradient-to-br from-white via-cyan-300 to-sky-600 shadow-[0_0_25px_rgba(56,189,248,0.8),inset_-3px_-3px_8px_rgba(3,105,161,0.8),inset_4px_4px_10px_rgba(255,255,255,0.95)]">
                  {/* Highlight glint */}
                  <div className="absolute left-2.5 top-2 h-4 w-5 -rotate-45 rounded-full bg-white blur-[0.5px]" />
                  <div className="absolute right-3 bottom-3 h-1.5 w-1.5 rounded-full bg-white/70" />
                </div>
              </div>
            </motion.div>

            {/* Expanding Concentric Ripple Waves */}
            <div className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2">
              {RIPPLE_WAVES.map((wave) => (
                <motion.div
                  key={wave.id}
                  className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border ${wave.color}`}
                  initial={{
                    width: 0,
                    height: 0,
                    opacity: 0,
                    scale: 0.1,
                  }}
                  animate={{
                    width: [0, wave.maxSize],
                    height: [0, wave.maxSize * 0.45],
                    opacity: [0, 0.9, 0.6, 0],
                    scale: [0.1, 1],
                  }}
                  transition={{
                    delay: SPLASH_START + wave.delay,
                    duration: EXPAND_DURATION + 0.2,
                    ease: [0.12, 0.8, 0.25, 1],
                  }}
                />
              ))}
            </div>

            {/* Splashing Micro-Droplets (Particles) */}
            <div className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2">
              {Array.from({ length: 14 }).map((_, i) => {
                const angle = (i / 14) * Math.PI * 2 + 0.2
                const radius = 90 + (i % 5) * 28
                const targetX = Math.cos(angle) * radius * 1.5
                const targetY = Math.sin(angle) * (radius * 0.6) - (40 + (i % 3) * 20)

                return (
                  <motion.div
                    key={i}
                    className="absolute h-2 w-2 rounded-full bg-gradient-to-br from-white to-cyan-200 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{
                      x: [0, targetX * 0.5, targetX],
                      y: [0, targetY, targetY + 30],
                      scale: [0, 1.2, 0.3],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      delay: SPLASH_START + 0.02 + (i % 4) * 0.025,
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                )
              })}
            </div>

            {/* Impact Celebration Badge */}
            <motion.div
              className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0.5, opacity: 0, y: 15 }}
              animate={{
                scale: [0.5, 1.1, 1],
                opacity: [0, 1, 1, 0],
                y: [15, -10, -25],
              }}
              transition={{
                delay: SPLASH_START + 0.1,
                duration: 0.85,
                ease: 'easeOut',
              }}
            >
              <div className="flex items-center gap-2 rounded-full border border-white/50 bg-gradient-to-r from-cyan-500/40 via-rose-500/40 to-pink-500/40 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200 animate-pulse" />
                <span className="tracking-wide">Every drop creates a ripple</span>
                <Droplets className="h-3.5 w-3.5 text-rose-200" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
