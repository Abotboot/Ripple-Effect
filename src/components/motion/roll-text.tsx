import type { CSSProperties } from 'react'

// A label whose letters roll up and are replaced by a fresh copy when the
// nearest [data-roll] ancestor is hovered or focused. Screen readers get the
// plain label once; both visual rows are hidden from them.
export function RollText({ text }: { text: string }) {
  const chars = Array.from(text)
  const row = (copy: boolean) => (
    <span className={copy ? 'roll-row roll-row--copy' : 'roll-row'} aria-hidden="true">
      {chars.map((char, index) => (
        <span key={index} style={{ '--ci': index } as CSSProperties}>{char === ' ' ? ' ' : char}</span>
      ))}
    </span>
  )
  return <span className="roll-text"><span className="sr-only">{text}</span>{row(false)}{row(true)}</span>
}
