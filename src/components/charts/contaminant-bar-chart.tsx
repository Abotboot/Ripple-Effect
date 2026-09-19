'use client'

import type { ContaminantSummary } from '@/lib/types'
import { summaryPresentation, type BenchmarkComparison } from '@/lib/assessment-presentation'

function Comparison({ comparison }: { comparison: BenchmarkComparison }) {
  const color = comparison.tone === 'danger' ? 'text-rose-600 dark:text-rose-300' : comparison.tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
  return <div data-status={comparison.status} className={color}>
    <span className="block">{comparison.label}</span>
    {comparison.ratio != null && <span className="mt-1 block font-mono text-xs">{Number(comparison.ratio.toPrecision(3))}× benchmark</span>}
  </div>
}

/** Independent normalized comparisons. A missing value is never plotted as 0. */
export function ContaminantBarChart({ summaries }: { summaries: ContaminantSummary[] }) {
  if (!summaries.length) return <p className="text-sm text-muted-foreground">No measurement data. Comparisons are not assessed.</p>
  return <div data-testid="contaminant-comparisons" className="overflow-x-auto" tabIndex={0} aria-label="Contaminant benchmark comparisons">
    <table className="w-full min-w-[440px] text-left text-sm">
      <caption className="pb-4 text-left text-xs leading-relaxed text-muted-foreground">Each benchmark is assessed independently using reviewed records and compatible units. Unavailable comparisons remain unassessed.</caption>
      <thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="px-2 py-3 font-medium">Contaminant / latest</th><th scope="col" className="px-2 py-3 font-medium">Health guideline</th><th scope="col" className="px-2 py-3 font-medium">Legal limit</th></tr></thead>
      <tbody>{summaries.map(summary => {
        const assessment = summaryPresentation(summary)
        return <tr key={summary.contaminant.id} data-testid="contaminant-comparison-row" className="border-b border-border/60 align-top">
          <th scope="row" className="px-2 py-3 font-medium"><span className="block">{summary.contaminant.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{assessment.valueText}</span></th>
          <td className="px-2 py-3"><Comparison comparison={assessment.health} /></td>
          <td className="px-2 py-3"><Comparison comparison={assessment.legal} /></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}
