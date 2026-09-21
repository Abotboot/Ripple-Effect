import snapshot from '@/data/epa-ucmr5.json'
import type { OfficialMonitoring } from './official-monitoring'

type Identity = { pwsid: string; name: string; state: string }

export function directoryMatchesForPwsid(pwsid: string) {
  return snapshot.utilities.filter(entry => entry.systems.some(system => system.pwsid === pwsid))
    .map(entry => ({ pwsid: entry.directoryPwsid, name: entry.directoryName, state: entry.state }))
}

/** Explicit, reviewed directory crosswalk. Never infer identity from a city or an old ID alone. */
export function getOfficialMonitoring(utility: Identity): OfficialMonitoring | null {
  const match = snapshot.utilities.find(entry => entry.directoryName === utility.name && entry.state === utility.state &&
    (entry.directoryPwsid === utility.pwsid || entry.systems.some(system => system.pwsid === utility.pwsid)))
  if (!match) return null
  return { sourceUrl: snapshot.sourceUrl, downloadUrl: snapshot.downloadUrl,
    benchmarkUrl: snapshot.benchmarkUrl, release: snapshot.release, systems: match.systems, records: match.records }
}

/** Correct public directory identifiers without relabeling or rewriting legacy samples. */
export function withOfficialIdentity<T extends Identity>(utility: T): T {
  const report = getOfficialMonitoring(utility)
  return report ? { ...utility, pwsid: report.systems[0].pwsid } : utility
}
