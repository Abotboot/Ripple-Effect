'use client'

import { useSyncExternalStore } from 'react'
import { CHANGE_EVENT, motionChoice, REDUCE_QUERY, setMotionChoice } from '@/lib/motion-choice'

// When a device asks for reduced motion, the site keeps animation to a
// minimum, and says so once with an offer to turn animations on. The footer
// keeps a switch for changing it later. Neither shows on devices that don't
// ask for reduced motion.

const subscribe = (onChange: () => void) => {
  const query = matchMedia(REDUCE_QUERY)
  query.addEventListener('change', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => { query.removeEventListener('change', onChange); window.removeEventListener(CHANGE_EVENT, onChange) }
}
const snapshot = () => `${matchMedia(REDUCE_QUERY).matches ? 'reduce' : 'full'}:${motionChoice() ?? 'none'}`
const serverSnapshot = () => 'full:none'

function useMotionState() {
  const [device, choice] = useSyncExternalStore(subscribe, snapshot, serverSnapshot).split(':')
  return { deviceReduces: device === 'reduce', choice }
}

export function MotionNotice() {
  const { deviceReduces, choice } = useMotionState()
  if (!deviceReduces || choice !== 'none') return null
  return (
    <div className="motion-notice" role="region" aria-label="Animation setting">
      <p>Your device is set to reduce animations, so this site is keeping motion to a minimum.</p>
      <div className="motion-notice-actions">
        <button type="button" className="motion-notice-on" onClick={() => setMotionChoice('full')}>Turn animations on</button>
        <button type="button" onClick={() => setMotionChoice('reduce', false)}>Keep them reduced</button>
      </div>
    </div>
  )
}

export function MotionToggle() {
  const { deviceReduces, choice } = useMotionState()
  if (!deviceReduces) return null
  const on = choice === 'full'
  return (
    <button
      type="button"
      className="hover:text-primary transition-colors underline-offset-2 hover:underline"
      onClick={() => setMotionChoice(on ? 'reduce' : 'full')}
    >
      {on ? 'Animations on · reduce them' : 'Animations reduced · turn on'}
    </button>
  )
}
