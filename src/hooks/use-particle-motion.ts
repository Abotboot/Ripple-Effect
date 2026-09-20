'use client'

import { useState, useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'
const snapshot = () => matchMedia(query).matches
const serverSnapshot = () => false
function subscribe(notify: () => void) {
  const preference = matchMedia(query)
  preference.addEventListener('change', notify)
  return () => preference.removeEventListener('change', notify)
}

export function useParticleMotion() {
  const reduced = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const [override, setOverride] = useState(false)
  const [manualPause, setManualPause] = useState(false)
  const paused = manualPause || reduced && !override
  const toggle = () => {
    if (reduced && !override) { setOverride(true); setManualPause(false) }
    else setManualPause(value => !value)
  }
  return { paused, override, toggle, label: reduced && !override ? 'Enable motion' : paused ? 'Resume motion' : 'Pause motion' }
}
