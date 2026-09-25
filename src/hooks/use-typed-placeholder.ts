'use client'

import { useEffect, useState } from 'react'

/**
 * Types example queries into a placeholder, one after another, while `active`.
 * Holds the first phrase for reduced motion or when inactive.
 */
export function useTypedPlaceholder(phrases: readonly string[], active: boolean): string {
  const [text, setText] = useState(phrases[0] ?? '')

  useEffect(() => {
    if (!active || phrases.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Restart from the first phrase each time typing resumes.
    const reset = window.setTimeout(() => setText(phrases[0]), 0)
    let phrase = 0
    let length = phrases[0].length
    let deleting = false
    let timer = 0
    const step = () => {
      const target = phrases[phrase]
      if (!deleting && length < target.length) {
        length++
        timer = window.setTimeout(step, 55 + Math.random() * 45)
      } else if (!deleting) {
        deleting = true
        timer = window.setTimeout(step, 1900)
      } else if (length > 0) {
        length--
        timer = window.setTimeout(step, 28)
      } else {
        deleting = false
        phrase = (phrase + 1) % phrases.length
        timer = window.setTimeout(step, 260)
      }
      setText(phrases[phrase].slice(0, length) + (length < phrases[phrase].length ? '▍' : ''))
    }
    timer = window.setTimeout(step, 2400)
    return () => { clearTimeout(timer); clearTimeout(reset) }
  }, [active, phrases])

  return active ? text : phrases[0] ?? ''
}
