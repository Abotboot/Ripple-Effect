'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { TankCanvas, TankCanvasHandle, ParticleFilter } from './tank-canvas'
import { MicroscopeStage } from './microscope-stage'
import './tank.css'
import './microscope.css'

export { TankCanvas }

export function TankHero({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<ParticleFilter>('all')

  const canvasRef = useRef<TankCanvasHandle>(null)
  const entryMotion = useRef<gsap.core.Timeline | null>(null)
  const microscopePlay = useRef<(() => void) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  const finishEntry = useCallback((shouldFocusSearch = false) => {
    if (dialog.current?.open) {
      dialog.current.close()
    }
    setEntered(true)
    setLeaving(false)
    setRevealing(false)
    try {
      sessionStorage.setItem('ripple-entered', '1')
    } catch {
      /* Storage may be unavailable or disabled */
    }
    if (shouldFocusSearch) {
      const input = document.querySelector<HTMLInputElement>('.tank-search input')
      input?.focus({ preventScroll: true })
    }
  }, [])

  const skip = useCallback(() => {
    entryMotion.current?.kill()
    microscopePlay.current = null
    finishEntry(true)
  }, [finishEntry])

  useEffect(() => {
    try {
      const hasIntroQuery = new URLSearchParams(window.location.search).has('intro')
      const hasEnteredSession = sessionStorage.getItem('ripple-entered')
      const hasHash = !!window.location.hash
      if (!hasIntroQuery && (hasEnteredSession || hasHash)) {
        setEntered(true)
        return
      }
    } catch {
      /* Storage access guard */
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEntered(true)
      return
    }

    const gate = dialog.current
    if (gate && !gate.open) {
      gate.showModal()
    }

    const ctx = gsap.context(() => {
      entryMotion.current = gsap.timeline({ defaults: { ease: 'power2.out' } })
        .fromTo('.microscope-viewport', { filter: 'blur(12px)', scale: 1.05 }, { filter: 'blur(0px)', scale: 1, duration: 1.6 }, 0)
        .from('.microscope-copy > *', { opacity: 0, y: 14, duration: 0.5, stagger: 0.1 }, 0.3)
    }, gate!)

    return () => {
      ctx.revert()
      if (gate?.open) gate.close()
    }
  }, [])

  const enter = () => {
    if (leaving || revealing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishEntry(true)
      return
    }
    setLeaving(true)
    entryMotion.current?.kill()

    const gate = dialog.current
    if (!gate) {
      finishEntry(true)
      return
    }

    entryMotion.current = gsap.timeline({
      onComplete: () => {
        if (microscopePlay.current) {
          microscopePlay.current()
        } else {
          finishEntry(true)
        }
      },
    })
      .to(gate.querySelectorAll('.microscope-copy'), { opacity: 0, duration: 0.25 }, 0)
  }

  const handleReveal = (coords: { x: number; y: number }) => {
    setRevealing(true)
    // Scatter homepage particles outward from projected ocular lens origin
    canvasRef.current?.triggerImpulse(coords.x, coords.y, 1.8)

    const gate = dialog.current
    if (!gate) {
      finishEntry(true)
      return
    }

    gate.classList.add('is-revealing')
    const px = (coords.x * 100).toFixed(1)
    const py = (coords.y * 100).toFixed(1)

    gsap.fromTo(
      gate,
      { clipPath: `circle(0% at ${px}% ${py}%)` },
      {
        clipPath: `circle(150% at ${px}% ${py}%)`,
        duration: 0.85,
        ease: 'power2.inOut',
        onComplete: () => {
          finishEntry(true)
        },
      }
    )
  }

  return (
    <section className="tank-hero" aria-labelledby="tank-title">
      <TankCanvas
        ref={canvasRef}
        paused={paused}
        filter={filter}
        enabled={entered || revealing}
      />

      <div className="tank-editorial">
        <p className="tank-eyebrow">A RIPPLE EFFECT INITIATIVE</p>
        <h1 id="tank-title">
          Clear water.<br className="hidden sm:inline" />{' '}
          <em>Look closer.</em>
        </h1>
        <div className="tank-copy">
          <p>Explore water readings and the evidence behind them.</p>
          <p>Trace tested contaminants across municipal utilities and community waterways with traceable provenance.</p>
        </div>
        <div className="tank-search">{children}</div>
      </div>

      <div className="tank-canvas-controls" role="toolbar" aria-label="Particle visualizer controls">
        <span className="tank-canvas-label">Illustrative particles · not to scale</span>
        <div className="tank-filter-group" role="group" aria-label="Particle type filter">
          {(['all', 'fibers', 'fragments', 'granules'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`tank-ctrl-btn ${filter === f ? 'is-active' : ''}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className={`tank-ctrl-btn ${paused ? 'is-paused' : ''}`}
        >
          {paused ? 'Resume motion' : 'Pause motion'}
        </button>
      </div>

      {!entered && (
        <dialog
          ref={dialog}
          className={`tank-gate${leaving ? ' is-leaving' : ''}${revealing ? ' is-revealing' : ''}`}
          onCancel={(e) => {
            e.preventDefault()
            skip()
          }}
          aria-labelledby="gate-title"
        >
          <div className="gate-top">
            <span>RIPPLE EFFECT</span>
          </div>

          <div className="microscope-viewport">
            <MicroscopeStage
              onComplete={() => finishEntry(true)}
              onReveal={handleReveal}
              onReady={(play) => {
                microscopePlay.current = play
              }}
            />
          </div>

          <div className="gate-center microscope-copy">
            <p className="tank-eyebrow">LOOK BENEATH THE SURFACE</p>
            <h2 id="gate-title">
              A closer<br /><em>look changes everything.</em>
            </h2>
            <button type="button" className="gate-enter" onClick={enter}>
              ENTER THE CURRENT <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="gate-skip" onClick={skip}>
              SKIP INTRO ↗
            </button>
          </div>
        </dialog>
      )}
    </section>
  )
}
