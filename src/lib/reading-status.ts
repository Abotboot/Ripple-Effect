// How a reading on the water compares with its benchmarks. Plain data, so any
// page can use it without pulling Leaflet into its bundle.

export type ReadingStatus = 'legal' | 'health' | 'below' | 'unassessed'

export const READING_STATUS: Record<ReadingStatus, { color: string; label: string }> = {
  legal: { color: '#ff5d73', label: 'Above MCL benchmark' },
  health: { color: '#f6b73c', label: 'Above health guideline' },
  below: { color: '#1df2b3', label: 'Below compared benchmarks' },
  unassessed: { color: '#8fd3ff', label: 'Unreviewed or illustrative' },
}
