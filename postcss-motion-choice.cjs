// PostCSS plugin: lets a visitor turn animations back on when their device
// asks for reduced motion (see src/lib/motion-choice.ts).
//
// - Rules inside @media (prefers-reduced-motion: reduce) are scoped so they
//   only apply while <html> is not marked data-motion="full".
// - Rules inside @media (... prefers-reduced-motion: no-preference) are also
//   copied without that condition, scoped to data-motion="full".
// Nothing changes for anyone who has not made that choice. It runs after
// Tailwind, so Tailwind's motion-reduce: and motion-safe: utilities are
// covered too.

const REDUCE = /prefers-reduced-motion:\s*reduce/
const SAFE = /(\s*and\s*)?\(\s*prefers-reduced-motion:\s*no-preference\s*\)(\s*and\s*)?/

// Put a guard on the root element: on a selector that starts there, or as
// an ancestor of any other selector.
function scope(selector, guard) {
  const trimmed = selector.trim()
  const root = trimmed.match(/^(html|:root)((?:[.#[:][^\s>+~]*)?)/)
  if (root) return trimmed.replace(root[0], root[0] + guard)
  return `:root${guard} ${trimmed}`
}

const scopeRules = (node, guard) => node.walkRules(rule => {
  if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
  rule.selectors = rule.selectors.map(selector => scope(selector, guard))
})

module.exports = () => ({
  postcssPlugin: 'postcss-motion-choice',
  OnceExit(css) {
    const safe = []
    css.walkAtRules('media', media => {
      if (REDUCE.test(media.params)) scopeRules(media, ':not([data-motion=full])')
      else if (SAFE.test(media.params)) safe.push(media)
    })
    for (const media of safe) {
      const rest = media.params.replace(SAFE, (match, before, after) => (before && after ? ' and ' : '')).trim()
      const copy = media.clone()
      scopeRules(copy, '[data-motion=full]')
      if (rest) { copy.params = rest; media.after(copy) }
      else media.after(copy.nodes)
    }
  },
})
module.exports.postcss = true
