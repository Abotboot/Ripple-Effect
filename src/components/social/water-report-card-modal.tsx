'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Copy, Share2, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { UtilityWithStats } from '@/lib/types'

interface WaterReportCardModalProps {
  utility: UtilityWithStats | null
  open: boolean
  onClose: () => void
}

export function WaterReportCardModal({
  utility,
  open,
  onClose,
}: WaterReportCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !utility) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      // High-resolution landscape card for Twitter / LinkedIn / Discord (1200 x 630)
      const W = 1200
      const H = 630
      canvas.width = W
      canvas.height = H

      // 1. Deep Ocean / Slate gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, W, H)
      bgGradient.addColorStop(0, '#060d19')
      bgGradient.addColorStop(0.5, '#0b192e')
      bgGradient.addColorStop(1, '#050b14')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, W, H)

      // 2. Ambient glowing orbs in canvas
      const glow1 = ctx.createRadialGradient(W - 180, 120, 10, W - 180, 120, 320)
      glow1.addColorStop(0, 'rgba(14, 165, 233, 0.22)')
      glow1.addColorStop(1, 'rgba(14, 165, 233, 0)')
      ctx.fillStyle = glow1
      ctx.fillRect(0, 0, W, H)

      const glow2 = ctx.createRadialGradient(180, H - 100, 10, 180, H - 100, 280)
      glow2.addColorStop(0, 'rgba(244, 63, 94, 0.15)')
      glow2.addColorStop(1, 'rgba(244, 63, 94, 0)')
      ctx.fillStyle = glow2
      ctx.fillRect(0, 0, W, H)

      // 3. Subtle grid lines / watermark texture
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
      ctx.lineWidth = 1
      for (let x = 60; x < W; x += 60) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 60; y < H; y += 60) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // 4. Outer decorative border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.lineWidth = 2
      ctx.strokeRect(30, 30, W - 60, H - 60)

      // 5. Header: Logo & Badge
      ctx.fillStyle = 'rgba(14, 165, 233, 0.18)'
      ctx.beginPath()
      ctx.roundRect(70, 65, 340, 38, 19)
      ctx.fill()
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.45)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#38bdf8'
      ctx.fillText('💧 A RIPPLE EFFECT INITIATIVE', 92, 89)

      // Report Type badge (right side)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.beginPath()
      ctx.roundRect(W - 320, 65, 250, 38, 19)
      ctx.fill()
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '600 13px system-ui, -apple-system, sans-serif'
      ctx.fillText('FRESHWATER DATA REPORT', W - 300, 89)

      // 6. Utility Title & Location
      ctx.font = '900 46px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#ffffff'
      const title = utility.name.length > 36 ? utility.name.slice(0, 34) + '…' : utility.name
      ctx.fillText(title, 70, 168)

      ctx.font = '500 22px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#94a3b8'
      const pop = utility.population ?? (utility as any).populationServed
      const popText = pop ? ` · ${pop.toLocaleString()} residents served` : ''
      ctx.fillText(`${utility.city}, ${utility.state}${popText}`, 70, 204)

      // 7. Core Stats Cards (3 horizontal cards)
      const cardY = 240
      const cardH = 120
      const cardW = 330
      const gap = 35

      // Stat 1: Total Contaminants
      const summaries = utility.contaminantSummaries || []
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.beginPath()
      ctx.roundRect(70, cardY, cardW, cardH, 16)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.stroke()

      ctx.font = '700 13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('CONTAMINANTS TRACKED', 95, cardY + 38)
      ctx.font = '900 48px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`${summaries.length}`, 95, cardY + 92)

      // Stat 2: Health Exceedances (Gold/Amber)
      const card2X = 70 + cardW + gap
      const hExceed = utility.healthExceedances ?? 0
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)'
      ctx.beginPath()
      ctx.roundRect(card2X, cardY, cardW, cardH, 16)
      ctx.fill()
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)'
      ctx.stroke()

      ctx.font = '700 13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('ABOVE EWG HEALTH GUIDELINES', card2X + 25, cardY + 38)
      ctx.font = '900 48px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#fef3c7'
      ctx.fillText(`${hExceed}`, card2X + 25, cardY + 92)

      // Stat 3: Legal Exceedances or Microplastics
      const card3X = card2X + cardW + gap
      const lExceed = utility.exceedances ?? 0
      const hasLegalExceedance = lExceed > 0
      ctx.fillStyle = hasLegalExceedance ? 'rgba(244, 63, 94, 0.14)' : 'rgba(16, 185, 129, 0.12)'
      ctx.beginPath()
      ctx.roundRect(card3X, cardY, cardW, cardH, 16)
      ctx.fill()
      ctx.strokeStyle = hasLegalExceedance ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)'
      ctx.stroke()

      ctx.font = '700 13px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = hasLegalExceedance ? '#fb7185' : '#34d399'
      ctx.fillText(hasLegalExceedance ? 'ABOVE EPA LEGAL LIMITS' : 'EPA LEGAL STATUS', card3X + 25, cardY + 38)
      ctx.font = '900 44px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = hasLegalExceedance ? '#ffe4e6' : '#d1fae5'
      ctx.fillText(hasLegalExceedance ? `${lExceed} Violations` : 'Within Legal Limits', card3X + 25, cardY + 92)

      // 8. Top Detected Contaminants List (Bottom section)
      ctx.font = '700 14px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText('KEY WATER QUALITY FINDINGS', 70, 405)

      const topItems = summaries.slice(0, 3)
      if (topItems.length === 0) {
        ctx.font = 'italic 14px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.fillText('Detailed contaminant measurement records logged in database.', 70, 445)
      } else {
        topItems.forEach((item, idx) => {
          if (!item) return
          const y = 430 + idx * 36
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
          ctx.beginPath()
          ctx.roundRect(70, y, W - 140, 30, 8)
          ctx.fill()

          // Dot indicator
          ctx.fillStyle = item.exceedsLegalLimit
            ? '#f43f5e'
            : item.exceedsHealthGuideline
            ? '#f59e0b'
            : '#10b981'
          ctx.beginPath()
          ctx.arc(88, y + 15, 5, 0, Math.PI * 2)
          ctx.fill()

          // Contaminant name
          ctx.font = '600 14px system-ui, -apple-system, sans-serif'
          ctx.fillStyle = '#f8fafc'
          const name = item.contaminant?.name || (item as any).name || 'Contaminant'
          ctx.fillText(name, 108, y + 20)

          // Value & Unit
          ctx.font = '14px monospace'
          ctx.fillStyle = '#94a3b8'
          const val = item.latestLevel ?? (item as any).level ?? 0
          const unit = item.unit || ''
          ctx.fillText(`${val} ${unit}`, W - 340, y + 20)

          // Status flag
          const statusText = item.exceedsLegalLimit
            ? 'EXCEEDS LEGAL LIMIT'
            : item.exceedsHealthGuideline
            ? 'EXCEEDS HEALTH GUIDELINE'
            : 'WITHIN GUIDELINES'
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
          ctx.fillStyle = item.exceedsLegalLimit
            ? '#f43f5e'
            : item.exceedsHealthGuideline
            ? '#fbbf24'
            : '#34d399'
          ctx.fillText(statusText, W - 200, y + 20)
        })
      }

      // 9. Footer: Call to action & Website URL
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.fillRect(70, 555, W - 140, 1)

      ctx.font = '500 14px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.fillText('Untreated freshwater and microplastics database. Crowdsourced & verified.', 70, 585)

      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#38bdf8'
      ctx.fillText('Check your local water: rippleeffecter.netlify.app', W - 460, 585)

      // Save as data URL for quick preview
      setDataUrl(canvas.toDataURL('image/png'))
    } catch (err) {
      console.error('Failed to draw canvas report card:', err)
    }
  }, [open, utility])

  if (!open || !utility) return null

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `water-report-${utility.city.toLowerCase().replace(/\s+/g, '-')}-${utility.state}.png`
    a.click()
    toast.success('Downloaded Water Report Card PNG!')
  }

  const handleCopy = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          setCopied(true)
          toast.success('Water Report Card copied to clipboard!')
          setTimeout(() => setCopied(false), 2500)
        } else {
          handleDownload()
        }
      })
    } catch {
      handleDownload()
    }
  }

  const handleShareX = () => {
    const hExceed = utility.healthExceedances ?? 0
    const exceedanceStr = hExceed > 0
      ? `${hExceed} contaminants exceed EWG health guidelines`
      : 'Clean bill on health guidelines'
    const text = encodeURIComponent(
      `Water quality report for ${utility.name} (${utility.city}, ${utility.state}): ${exceedanceStr}. See untreated freshwater and microplastics data near you on A Ripple Effect Initiative:`
    )
    const url = encodeURIComponent('https://rippleeffecter.netlify.app/#map')
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - without the requested removed string */}
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="font-bold text-base text-foreground">
              Community Water Quality Card
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Canvas Card Preview */}
          <div className="p-4 sm:p-5 bg-muted/20">
            <div className="overflow-hidden rounded-xl border border-border/80 shadow-lg bg-card">
              {/* Offscreen high-res canvas (never hidden via display:none) */}
              <canvas
                ref={canvasRef}
                style={{
                  position: 'fixed',
                  left: -99999,
                  top: -99999,
                  pointerEvents: 'none',
                  visibility: 'hidden',
                }}
              />

              {/* Responsive preview image */}
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`Water Report Card for ${utility.name}`}
                  className="w-full h-auto object-cover rounded-xl"
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-card text-xs text-muted-foreground">
                  Rendering report card...
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/10 px-5 py-4">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {utility.name} · {utility.city}, {utility.state}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied Image!' : 'Copy to Clipboard'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </Button>

              <Button
                size="sm"
                onClick={handleShareX}
                className="gap-1.5 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black font-semibold"
              >
                <Share2 className="h-4 w-4" />
                Share on X
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
