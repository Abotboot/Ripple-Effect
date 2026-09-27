import { Children, Fragment, isValidElement, type CSSProperties, type ReactNode } from 'react'

// Words light up one after another as a statement scrolls up the screen.
// After TextReveal in Magic UI (github.com/magicuidesign/magicui, MIT), which
// pins the text and drives each word from a scroll listener. Here nothing is
// pinned (no extra scrolling) and the browser drives it: each word's opacity
// follows a CSS view timeline, on the compositor. Browsers without scroll-
// driven animations, and Reduce Motion, simply show the text (motion.css).
// Strings are split into words; elements (a link, a mark) count as one word.

export function ScrollWords({ children, className }: { children: ReactNode; className?: string }) {
  const parts: ReactNode[] = []
  Children.forEach(children, child => {
    if (typeof child === 'string') {
      for (const word of child.split(/(\s+)/)) if (word) parts.push(word)
    } else if (isValidElement(child)) parts.push(child)
  })
  const words = parts.filter(part => typeof part !== 'string' || part.trim()).length
  let index = 0
  return (
    <p className={className ? `scroll-words ${className}` : 'scroll-words'}>
      {parts.map((part, i) => {
        if (typeof part === 'string' && !part.trim()) return <Fragment key={i}>{part}</Fragment>
        const at = index++ / Math.max(1, words - 1)
        return <span key={i} className="sw" style={{ '--sw': at.toFixed(3) } as CSSProperties}>{part}</span>
      })}
    </p>
  )
}
