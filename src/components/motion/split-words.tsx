import type { CSSProperties } from 'react'

/**
 * Renders text as masked words that rise in when their [data-split] parent is
 * revealed. `start` continues the stagger across several calls in one heading.
 */
export function SplitWords({ text, start = 0 }: { text: string; start?: number }) {
  let index = start
  return <>{text.split(/(\s+)/).map((part, key) => {
    if (!part) return null
    if (/^\s+$/.test(part)) return part
    return <span key={key} className="split-word"><span className="split-inner" style={{ '--i': index++ } as CSSProperties}>{part}</span></span>
  })}</>
}
