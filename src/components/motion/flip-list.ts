'use client'

import { useLayoutEffect, useRef } from 'react'
import { reducedMotion } from '@/lib/motion-choice'

// Items in a list slide to their new places when the list changes (a filter,
// a search, fresh data), and new items fade up instead of popping in.
//
// This is the FLIP technique that AutoAnimate (github.com/formkit/auto-animate,
// MIT) packages up: note where each child was, let React update the DOM, then
// play each child from its old place to its new one with the Web Animations
// API. AutoAnimate also polls every child on a timer to catch moves it did not
// cause; this version measures only when `key` changes, so an idle page does
// no work at all. With `appear`, the first items fade up too (for lists that
// mount once their data arrives; mark those [data-no-reveal] so the page's
// scroll reveals leave them alone).

const EASE = 'cubic-bezier(.16, 1, .3, 1)'

export function useFlipList<T extends HTMLElement>(key: unknown, { appear = false } = {}) {
  const ref = useRef<T>(null)
  const places = useRef(new WeakMap<Element, { x: number; y: number }>())
  const first = useRef(true)

  useLayoutEffect(() => {
    const list = ref.current
    if (!list) return
    const calm = reducedMotion()
    let entering = 0
    for (const child of list.children) {
      if (!(child instanceof HTMLElement)) continue
      // Relative to the list, so a change above it is not mistaken for a move.
      const own = child.offsetParent === list
      const now = { x: child.offsetLeft - (own ? 0 : list.offsetLeft), y: child.offsetTop - (own ? 0 : list.offsetTop) }
      const before = places.current.get(child)
      places.current.set(child, now)
      if (calm || (first.current && !appear)) continue
      if (before) {
        const dx = before.x - now.x, dy = before.y - now.y
        if (dx || dy) child.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 520, easing: EASE })
      } else {
        child.animate(
          [{ opacity: 0, translate: '0 10px', scale: '.98' }, { opacity: 1, translate: '0 0', scale: '1' }],
          { duration: 420, easing: EASE, delay: Math.min(entering++, 6) * 40, fill: 'backwards' },
        )
      }
    }
    first.current = false
  }, [key])

  return ref
}
