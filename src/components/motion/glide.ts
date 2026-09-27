'use client'

import { useLayoutEffect, useRef } from 'react'

// A highlight that glides to the active option of a tab bar or filter row
// instead of jumping. After AnimatedBackground in motion-primitives
// (github.com/ibelick/motion-primitives, MIT), which moves a shared layout
// element between items; here the row measures its active item and a CSS
// pseudo-element slides there, so nothing re-renders while it moves.
//
// Mark the row with data-glide (styles in motion.css). The active item is
// found by its own state attribute, so Radix tabs and plain buttons both work.

const ACTIVE = '[data-state=active], [aria-selected=true], [aria-pressed=true], [data-glide-on]'

export function useGlide<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const row = ref.current
    if (!row) return
    const place = () => {
      const on = [...row.querySelectorAll<HTMLElement>(ACTIVE)].find(el => el.parentElement === row)
      if (!on) { row.style.setProperty('--glide-o', '0'); return }
      row.style.setProperty('--glide-x', `${on.offsetLeft}px`)
      row.style.setProperty('--glide-y', `${on.offsetTop}px`)
      row.style.setProperty('--glide-w', `${on.offsetWidth}px`)
      row.style.setProperty('--glide-h', `${on.offsetHeight}px`)
      row.style.setProperty('--glide-o', '1')
    }
    place()
    // Slide only after the first placement, so it never flies in from 0,0.
    const ready = requestAnimationFrame(() => row.setAttribute('data-glide-ready', ''))
    const states = new MutationObserver(place)
    states.observe(row, { subtree: true, attributes: true, attributeFilter: ['data-state', 'aria-selected', 'aria-pressed', 'data-glide-on'] })
    const sizes = new ResizeObserver(place)
    sizes.observe(row)
    return () => { cancelAnimationFrame(ready); states.disconnect(); sizes.disconnect() }
  }, [])

  return ref
}
