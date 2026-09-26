// "Open another section and show this part of it": the caller stores the id
// of the element to reveal, then navigates; the section reads it on mount.

const KEY = 'ripple:section-focus'

export function requestSectionFocus(id: string) {
  try { sessionStorage.setItem(KEY, id) } catch { /* storage unavailable */ }
}

/** The pending target without consuming it (safe in render). */
export function peekSectionFocus(): string | null {
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

/** The pending target, consumed so it only applies once. */
export function takeSectionFocus(): string | null {
  try {
    const id = sessionStorage.getItem(KEY)
    if (id) sessionStorage.removeItem(KEY)
    return id
  } catch { return null }
}
