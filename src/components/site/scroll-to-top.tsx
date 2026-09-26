'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { glideToTop } from '@/components/atmosphere/smooth-current'

// Back-to-top control whose ring fills as the page is read. The ring follows
// the scroll position in CSS (a scroll-driven animation), so scrolling runs no
// script here beyond a cheap check of whether the button should show.
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let shown = false
    const onScroll = () => {
      const next = window.scrollY > 400
      if (next !== shown) { shown = next; setVisible(next) }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={glideToTop}
          className="group fixed bottom-20 right-5 z-40 flex h-12 w-12 items-center justify-center text-primary sm:bottom-24 sm:right-8"
          aria-label="Scroll to top"
        >
          {/* Site buttons are square by design; the disc lives on a span so the ring stays round. */}
          <span className="absolute inset-0 rounded-full bg-[#05080af2]" aria-hidden="true" />
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="none" stroke="#1f3530" strokeWidth="1.5" />
            <circle className="scroll-top-ring" cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" pathLength={1} />
          </svg>
          <ArrowUp className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
