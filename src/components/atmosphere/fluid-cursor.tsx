'use client'

import { useEffect, useRef, useState } from 'react'
import './fluid-cursor.css'

export function FluidCursor() {
  const [enabled, setEnabled] = useState(false)
  const dot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const preference = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    const configure = () => setEnabled(preference.matches)
    configure()
    preference.addEventListener('change', configure)
    return () => preference.removeEventListener('change', configure)
  }, [])

  useEffect(() => {
    const element = dot.current
    if (!enabled || !element) return
    let frame = 0
    let lastTime = 0
    let visible = false
    let x = 0, y = 0, goalX = 0, goalY = 0

    const hide = () => {
      cancelAnimationFrame(frame)
      frame = 0
      visible = false
      element.dataset.visible = 'false'
      element.dataset.state = 'idle'
    }
    const draw = (time: number) => {
      frame = 0
      const delta = Math.min(time - lastTime, 50)
      lastTime = time
      const ease = 1 - Math.exp(-delta / 65)
      x += (goalX - x) * ease
      y += (goalY - y) * ease
      const settled = Math.hypot(goalX - x, goalY - y) < .2
      if (settled) { x = goalX; y = goalY }
      element.style.setProperty('--fluid-x', `${x}px`)
      element.style.setProperty('--fluid-y', `${y}px`)
      if (!settled) frame = requestAnimationFrame(draw)
    }
    const move = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (event.pointerType !== 'mouse' || !target || document.hidden ||
        document.querySelector('dialog[open], [role="dialog"]') ||
        target.closest('input, textarea, select, iframe, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="textbox"]')) {
        hide()
        return
      }
      const link = target.closest('a[href], button:not(:disabled), [role="button"]:not([aria-disabled="true"])')
      goalX = event.clientX
      goalY = event.clientY
      if (link) {
        const rect = link.getBoundingClientRect()
        goalX += Math.max(-24, Math.min(24, (rect.left + rect.width / 2 - goalX) * .25))
        goalY += Math.max(-24, Math.min(24, (rect.top + rect.height / 2 - goalY) * .25))
      }
      element.dataset.state = link ? 'link' : 'idle'
      if (!visible) {
        x = event.clientX; y = event.clientY
        element.style.setProperty('--fluid-x', `${x}px`)
        element.style.setProperty('--fluid-y', `${y}px`)
        element.dataset.visible = 'true'
        visible = true
      }
      if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(draw) }
    }
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) hide() }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerout', leave, { passive: true })
    window.addEventListener('blur', hide)
    window.addEventListener('keydown', hide)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('hashchange', hide)
    document.addEventListener('visibilitychange', hide)
    return () => {
      hide()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerout', leave)
      window.removeEventListener('blur', hide)
      window.removeEventListener('keydown', hide)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('hashchange', hide)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [enabled])

  return enabled ? <div ref={dot} data-fluid-cursor="" data-visible="false" data-state="idle" aria-hidden="true" /> : null
}
