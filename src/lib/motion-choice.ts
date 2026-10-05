// Whether to keep motion to a minimum.
//
// The site follows the device's "reduce motion" setting by default. Some
// people have it on without meaning to (Windows performance and debloat
// tweaks switch off animation effects system-wide), so a visitor can turn
// animations back on for this site; the choice is kept in this browser.
//
// CSS: <html data-motion="full"> marks that choice, set before the first paint
// by the script in app/layout.tsx; postcss-motion-choice.cjs makes every
// reduced-motion rule step aside for it.

const KEY = 'ripple:motion'
export const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
/** Fired on window when the visitor changes the choice. */
export const CHANGE_EVENT = 'ripple:motion-choice'

export type MotionChoice = 'full' | 'reduce'

/** Runs before first paint (inlined into <head>), so there is no flash. */
export const MOTION_CHOICE_SCRIPT = `try{if(localStorage.getItem('${KEY}')==='full')document.documentElement.dataset.motion='full'}catch(e){}`

export function motionChoice(): MotionChoice | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'full' || value === 'reduce' ? value : null
  } catch { return null }
}

// Animation loops ask on every frame (the hero's particle physics, counters),
// so the answer is worked out once and kept: one media query for the life of
// the page, re-read only when the device setting or the visitor's choice
// changes (also from another tab).
let query: MediaQueryList | null = null
let reduced = false

function watch(): MediaQueryList {
  if (query) return query
  query = matchMedia(REDUCE_QUERY)
  const refresh = () => { reduced = query!.matches && motionChoice() !== 'full' }
  query.addEventListener('change', refresh)
  window.addEventListener(CHANGE_EVENT, refresh)
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) refresh() })
  refresh()
  return query
}

/** The device (operating system or browser) asks for less motion. */
export function deviceReducesMotion() {
  return typeof window !== 'undefined' && watch().matches
}

/** Keep motion to a minimum: the device asks for it and the visitor has not turned animations on. */
export function reducedMotion() {
  if (typeof window === 'undefined') return false
  watch()
  return reduced
}

/** Remember the choice; the page reloads so every animation starts in step with it. */
export function setMotionChoice(choice: MotionChoice, reload = true) {
  try { localStorage.setItem(KEY, choice) } catch { /* storage blocked: applies to this page only */ }
  if (choice === 'full') document.documentElement.dataset.motion = 'full'
  else delete document.documentElement.dataset.motion
  window.dispatchEvent(new Event(CHANGE_EVENT))
  if (reload) window.location.reload()
}
