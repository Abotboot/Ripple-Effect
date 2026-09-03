'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { Sparkles } from 'lucide-react'

// Timing (ms)
const HOLD_MS = 0
const FALL_MS = 1500
const LAND_SETTLE_MS = 500
const OUTRO_MS = 550
const TOTAL_MS = HOLD_MS + FALL_MS + LAND_SETTLE_MS + OUTRO_MS

type Ripple = { id: number; delay: number; size: number }

function RippleRing({ ripple }: { ripple: Ripple }) {
  const c = useAnimationControls()
  useEffect(() => {
    c.start({
      opacity: [0, 0.55, 0],
      scale: [0.2, 1, 1],
      width: ['8px', `${ripple.size}px`],
      height: ['3px', `${ripple.size * 0.32}px`],
      transition: {
        delay: ripple.delay / 1000,
        duration: 1.1,
        ease: 'easeOut',
        times: [0, 0.12, 1],
      },
    })
  }, [c, ripple])
  return (
    <motion.div
      animate={c}
      initial={{ opacity: 0, scale: 0.2, width: '8px', height: '3px' }}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-200/80"
    />
  )
}

/**
 * A one-time intro for the Donate hero: a glassy raindrop falls into a pool,
 * ripples spread, and the content rises into place. Entirely decorative; the
 * real hero copy renders behind/under this and is revealed as it animates.
 */
export function RaindropHero() {
  const [show, setShow] = useState(true)
  const [ripples, setRipples] = useState<Ripple[]>([])

  useEffect(() => {
    // Trigger splash rings as the drop lands, then clean up the overlay.
    const splash = HOLD_MS + FALL_MS - 40
    const timers = [
      window.setTimeout(() => {
        setRipples([
          { id: 1, delay: 0, size: 420 },
          { id: 2, delay: 180, size: 320 },
          { id: 3, delay: 380, size: 220 },
          { id: 4, delay: 620, size: 130 },
        ])
      }, splash),
      window.setTimeout(() => setShow(false), TOTAL_MS),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="raindrop"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
          aria-hidden="true"
        >
          {/* Water glow surface line for depth */}
          <motion.div
            className="absolute left-1/2 top-[64%] h-24 w-[520px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-cyan-300/30 blur-2xl"
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: [0, 1, 0.5, 1], scaleX: [0.2, 1.05, 1, 1] }}
            transition={{ delay: (HOLD_MS + FALL_MS - 200) / 1000 + 0.0, duration: 1.2, ease: 'easeOut' }}
          />

          {/* Ripple rings */}
          <div className="absolute left-1/2 top-[64%] -translate-x-1/2 -translate-y-1/2">
            {ripples.map((r) => (
              <RippleRing key={r.id} ripple={r} />
            ))}
          </div>

          {/* Splash drops */}
          <AnimatePresence>
            {ripples.length > 0 &&
              Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 6) * Math.PI * 2 + 0.35
                const dist = 110 + (i % 4) * 26
                return (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-[64%] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist - 46,
                      opacity: [0, 0.85, 0],
                      scale: [0, 1.1, 0.5],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      delay: (HOLD_MS + FALL_MS) / 1000 + 0.02 + (i % 3) * 0.05,
                      duration: 0.85,
                      ease: 'easeOut',
                    }}
                  />
                )
              })}
          </AnimatePresence>

          {/* Main falling drop */}
          <motion.div
            className="absolute left-1/2 top-0"
            initial={{ x: '-50%', y: -220, opacity: 0, scale: 0.9 }}
            animate={{
              x: '-50%',
              y: '54vh',
              opacity: [0, 1, 1, 0],
              scale: [0.9, 1, 1, 0.55],
            }}
            transition={{
              times: [0, 0.12, 0.62, 0.75],
              duration: (HOLD_MS + FALL_MS + LAND_SETTLE_MS) / 1000,
              ease: [0.32, 0.14, 0.64, 1],
            }}
          >
            {/* 3D-feel drop: layered highlight + body + base shadow */}
            <div className="relative -translate-y-1/2">
              {/* Inner shadow / depth */}
              <motion.div
                className="absolute -inset-3 rounded-full bg-gradient-to-br from-white/40 via-cyan-300/10 to-transparent blur-md"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
              />
              {/* Body */}
              <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-cyan-300 via-cyan-400 to-sky-600 shadow-[0_10px_40px_rgba(30,144,255,0.5),0_0_80px_rgba(103,232,249,0.35)]">
                {/* Body gradient overlay for spherical look */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(255,255,255,0.12)_42%,rgba(255,255,255,0)_56%),radial-gradient(circle_at_60%_75%,rgba(56,150,255,0.9),rgba(37,99,235,0.0)_55%)]" />
                {/* Top highlight */}
                <div className="absolute left-[18%] top-[12%] h-6 w-10 -rotate-[18deg] rounded-full bg-white/85 blur-[1px]" />
                {/* Secondary highlight */}
                <div className="absolute right-[20%] top-[38%] h-2.5 w-2.5 rounded-full bg-white/80 blur-[1px]" />
                {/* Bottom rim light for 3D */}
                <div className="absolute bottom-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-cyan-100/50 blur-[3px]" />
                {/* Shadow under drop */}
                <motion.div
                  className="absolute -bottom-6 left-1/2 h-4 w-16 -translate-x-1/2 rounded-[50%] bg-cyan-950/50 blur-md"
                  initial={{ scaleX: 0.6, opacity: 0.5 }}
                  animate={{ scaleX: [0.6, 1, 1], opacity: [0.35, 0.65, 0.4] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </motion.div>

          {/* Subtle falling streak trail */}
          <motion.div
            className="absolute left-1/2 top-[8%] h-44 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-200/60 to-cyan-200/0"
            initial={{ opacity: 0, scaleY: 0, originY: 1 }}
            animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
            transition={{ delay: 0.1, duration: (HOLD_MS + FALL_MS) / 1000, ease: 'easeIn', times: [0, 0.6, 1] }}
          />

          {/* Splash text tag */}
          <motion.div
            className="absolute left-1/2 top-[64%] -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.7, y: 28 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 0.95], y: [28, 0, 0, -18] }}
            transition={{ delay: (HOLD_MS + FALL_MS + 120) / 1000, duration: LAND_SETTLE_MS / 1000 + 0.25, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
              <Sparkles className="h-4 w-4" />
              A ripple of support starts now
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}