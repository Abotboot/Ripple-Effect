'use client'

import { useState } from 'react'

export function useParticleMotion() {
  const [paused, setPaused] = useState(false)
  const toggle = () => setPaused(value => !value)
  // Particle motion starts on. Pause is an explicit local choice, independent
  // of the browser preference used by the rest of the site's animations.
  return { paused, override: true, toggle, label: paused ? 'Resume motion' : 'Pause motion' }
}
