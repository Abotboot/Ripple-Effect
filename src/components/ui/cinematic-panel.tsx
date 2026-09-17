'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CinematicPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  maxTilt?: number // degrees (default 3)
  glare?: boolean
  className?: string
}

/**
 * CinematicPanel: An original 3D perspective tilt component.
 * Provides subtle (2-4 deg) angular response to pointer movement
 * with a localized specular glare highlight and graceful spring return.
 * Automatically disabled on coarse pointers (touch) and prefers-reduced-motion.
 */
export function CinematicPanel({
  children,
  maxTilt = 3,
  glare = true,
  className,
  style,
  ...props
}: CinematicPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const disabledRef = useRef(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarse = window.matchMedia('(pointer: coarse)')
    const update = () => {
      disabledRef.current = reduced.matches || coarse.matches
    }
    update()
    reduced.addEventListener('change', update)
    coarse.addEventListener('change', update)
    return () => {
      reduced.removeEventListener('change', update)
      coarse.removeEventListener('change', update)
    }
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabledRef.current) return
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height

      const tiltX = (py - 0.5) * -maxTilt
      const tiltY = (px - 0.5) * maxTilt

      setTransform(`perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`)

      if (glare) {
        setGlareStyle({
          opacity: 0.12,
          background: `radial-gradient(circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 65%)`,
        })
      }
    },
    [maxTilt, glare]
  )

  const handlePointerEnter = useCallback(() => {
    if (disabledRef.current) return
    setIsHovered(true)
  }, [])

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false)
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
    if (glare) {
      setGlareStyle({ opacity: 0 })
    }
  }, [glare])

  return (
    <div
      ref={ref}
      className={cn('relative transition-transform duration-300 ease-out will-change-transform', className)}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        ...style,
      }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            ...glareStyle,
            mixBlendMode: 'overlay',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
