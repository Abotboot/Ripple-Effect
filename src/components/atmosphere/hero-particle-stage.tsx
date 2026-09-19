'use client'

import { useState } from 'react'
import Image from 'next/image'
import { rippleAssets, rippleSequence } from '@/lib/ripple-assets'

export function HeroParticleStage({ terminal, onUnavailable }: { terminal: boolean; onUnavailable: (artwork: 'master' | 'terminal') => void }) {
  const master = rippleAssets.master
  const src = terminal ? rippleSequence.terminalPoster : master.src
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const unavailable = failedSource === src
  return (
    <div className="ripple-particle-stage" data-testid="particle-stage" data-renderer={unavailable ? 'unavailable' : terminal ? 'terminal-static-proof' : 'master-static'}>
      {unavailable ? <p className="ripple-artwork-fallback" data-testid="hero-artwork-unavailable">{terminal ? 'Final frame unavailable.' : 'Artwork unavailable.'}</p> : <Image key={src} src={src} alt={terminal ? 'Static final frame of the provisional particle continuation' : master.alt} width={terminal ? rippleSequence.width : master.width} height={terminal ? rippleSequence.height : master.height} sizes="100vw" preload={!terminal} loading={terminal ? 'eager' : undefined} fetchPriority={terminal ? 'high' : undefined} unoptimized={terminal} className="ripple-stage-image" data-testid="hero-artwork" onError={() => { setFailedSource(src); onUnavailable(terminal ? 'terminal' : 'master') }} />}
    </div>
  )
}
