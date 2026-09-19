import { particlePhotographs } from '@/lib/particle-photographs'

export function PhotographCredit({ photo, edited = false }: { photo: typeof particlePhotographs[keyof typeof particlePhotographs]; edited?: boolean }) {
  return <span className="photograph-credit"><a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.credit}</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a> · {edited ? 'AI cropped & relit' : 'Resized'}</span>
}
