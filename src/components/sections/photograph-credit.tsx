import { particlePhotographs } from '@/lib/particle-photographs'

export function PhotographCredit({ photo }: { photo: typeof particlePhotographs[keyof typeof particlePhotographs] }) {
  return <span className="photograph-credit"><a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.credit}</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></span>
}
