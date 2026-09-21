'use client'

import { officialAssessment, officialContaminants, officialResultStatus, officialResultText, type OfficialMonitoring } from '@/lib/official-monitoring'

export function OfficialMonitoringPanel({ report }: { report: OfficialMonitoring }) {
  const assessment = officialAssessment(report)
  const dates = report.records.map(row => row.date).sort()
  return <section data-testid="official-monitoring" className="space-y-5">
    <div>
      <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-wider text-primary underline underline-offset-4">EPA UCMR 5 · {report.release}</a>
      <h3 className="mt-3 text-2xl font-semibold">PFAS monitoring results</h3>
      <p className="mt-2 text-sm text-muted-foreground">{report.records.length} results · {dates[0]} to {dates.at(-1)}</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {officialContaminants(report).map(item => <div key={item.name} className="border border-border bg-card p-4">
        <h4 className="font-semibold">{item.name}</h4>
        <p className="mt-3 text-2xl font-semibold tabular-nums">{item.maximum}</p>
        <p className="text-xs text-muted-foreground">{item.detected ? 'Highest detected result' : 'All results below reporting limit'}</p>
        <p className={`mt-3 text-sm ${item.above ? 'text-rose-400' : 'text-foreground'}`}>{item.above} of {item.compared} above 4 ppt</p>
      </div>)}
    </div>
    <p className="text-sm text-muted-foreground">
      Compared with the <a className="underline underline-offset-4" href={report.benchmarkUrl} target="_blank" rel="noopener noreferrer">federal 4 ppt MCL</a> for each compound. These historical sample comparisons are not compliance findings. “&lt;” means below the laboratory reporting limit.
    </p>
    <details className="border border-border p-4">
      <summary className="cursor-pointer text-sm font-medium">Explore {assessment.sampleCount} source results</summary>
      <div className="mt-4 space-y-1 text-xs text-muted-foreground">{report.systems.map(system => <p key={system.pwsid}>{system.name} · {system.pwsid}</p>)}</div>
      <div className="mt-4 max-h-96 overflow-auto overscroll-contain" tabIndex={0} role="region" aria-label="EPA source results" data-lenis-prevent>
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-border"><th className="p-2">Sample date / location</th><th className="p-2">Compound</th><th className="p-2">Result</th></tr></thead>
          <tbody>{report.records.map(row => <tr key={row.recordId} className="border-b border-border/50">
            <td className="p-2">{row.date}<details className="mt-1 text-muted-foreground"><summary className="cursor-pointer">{row.facilityName}</summary><p className="mt-2 break-all">{row.pwsid} · Facility {row.facilityId} · Point {row.samplePointId}<br />Sample {row.sampleId}<br />{row.method}</p></details></td>
            <td className="p-2">{row.contaminant}</td>
            <td className={`whitespace-nowrap p-2 tabular-nums ${officialResultStatus(row) === 'above' ? 'text-rose-400' : ''}`}>{officialResultText(row)}{officialResultStatus(row) === 'above' && <span className="mt-1 block text-[10px]">Above MCL benchmark</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>
}
