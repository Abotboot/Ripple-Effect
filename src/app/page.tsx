'use client'

import { useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import '@/components/site/tank-system.css'
import { SmoothCurrent, glideToTop, jumpToTop } from '@/components/atmosphere/smooth-current'
import { MotionSystem, lastPointerPosition } from '@/components/motion/motion-system'
import { SiteHeader, type Section } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { ScrollToTop } from '@/components/site/scroll-to-top'
import { HomeSection } from '@/components/sections/home-section'
import { DataSourcesSection } from '@/components/sections/data-sources-section'
import { CommunityReportsSection } from '@/components/sections/community-reports-section'
import { AboutSection } from '@/components/sections/about-section'
import { PartnershipsSection } from '@/components/sections/partnerships-section'
import { DonateSection } from '@/components/sections/donate-section'
import { FaqSection } from '@/components/sections/faq-section'
import { PrivacySection } from '@/components/sections/privacy-section'
import { TermsSection } from '@/components/sections/terms-section'
import { CommandPalette } from '@/components/site/command-palette'
import dynamic from 'next/dynamic'

// Heavy sections load on demand (map tiles, chart libs) instead of shipping
// with the home route. ssr:false keeps them client-only; sections here are
// conditionally mounted anyway, so there is no SEO content to lose.
const MapSection = dynamic(
  () => import('@/components/sections/map-section').then((m) => m.MapSection),
  { ssr: false, loading: () => <SectionFallback label="Loading map..." /> }
)
const MicroplasticsSection = dynamic(
  () => import('@/components/sections/microplastics-section').then((m) => m.MicroplasticsSection),
  { ssr: false, loading: () => <SectionFallback label="Loading..." /> }
)
const SubmitReadingSection = dynamic(
  () => import('@/components/sections/submit-reading-section').then((m) => m.SubmitReadingSection),
  { ssr: false, loading: () => <SectionFallback label="Loading..." /> }
)
const AdminSection = dynamic(
  () => import('@/components/sections/admin-section').then((m) => m.AdminSection),
  { ssr: false, loading: () => <SectionFallback label="Loading..." /> }
)

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {label}
      </div>
    </div>
  )
}

const VALID_SECTIONS: readonly Section[] = [
  'home',
  'map',
  'microplastics',
  'submit',
  'sources',
  'reports',
  'about',
  'partners',
  'faq',
  'donate',
  'admin',
  'privacy',
  'terms',
] as const

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

// Section changes ripple outward from the tap: the new page is revealed
// through a circle that grows from the pointer while the old one sinks back.
function rippleTransition(update: () => void): boolean {
  const doc = document as TransitionDocument
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const { x, y } = lastPointerPosition()
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const transition = doc.startViewTransition(update)
  transition.ready.then(() => {
    const timing = { duration: 900, easing: 'cubic-bezier(.83, 0, .17, 1)' }
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { ...timing, pseudoElement: '::view-transition-new(root)' },
    )
    document.documentElement.animate(
      { transform: ['scale(1)', 'scale(0.94)'], opacity: [1, 0.3], filter: ['brightness(1)', 'brightness(0.55)'] },
      { ...timing, pseudoElement: '::view-transition-old(root)' },
    )
  }).catch(() => {})
  return true
}

export default function Home() {
  const [section, setSectionState] = useState<Section>('home')
  // Browsers without view transitions get a soft rise on each section change.
  const [stageMotion, setStageMotion] = useState(false)

  useEffect(() => {
    const syncFromHash = () => {
      let raw = window.location.hash.replace(/^#/, '').toLowerCase().trim()
      if (raw === 'report') raw = 'reports'
      if (raw === 'reading' || raw === 'readings') raw = 'submit'
      const hash = raw as Section
      if (VALID_SECTIONS.includes(hash)) {
        setSectionState(hash)
      } else if (!hash) {
        setSectionState('home')
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])


  const setSection = (next: Section) => {
    const syncHash = () => {
      const currentHash = window.location.hash.replace(/^#/, '').toLowerCase()
      if (next === 'home') {
        if (window.location.hash) {
          history.pushState(null, '', window.location.pathname + window.location.search)
        }
      } else if (currentHash !== next) {
        window.location.hash = next
      }
    }
    if (next === section) {
      glideToTop()
      return
    }
    const apply = () => {
      flushSync(() => setSectionState(next))
      syncHash()
      jumpToTop()
    }
    if (!rippleTransition(apply)) {
      setStageMotion(!matchMedia('(prefers-reduced-motion: reduce)').matches)
      apply()
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SmoothCurrent />
      <MotionSystem />
      <SiteHeader current={section} onNavigate={setSection} />
      <main className="flex-1">
        <div key={section} className={stageMotion ? 'section-stage' : undefined}>
        {section === 'home' && <HomeSection onNavigate={setSection} />}
        {section === 'map' && <MapSection />}
        {section === 'microplastics' && <MicroplasticsSection onNavigate={setSection} />}
        {section === 'submit' && <SubmitReadingSection />}
        {section === 'sources' && <DataSourcesSection />}
        {section === 'reports' && <CommunityReportsSection />}
        {section === 'about' && <AboutSection onNavigate={setSection} />}
        {section === 'partners' && <PartnershipsSection onNavigate={setSection} />}
        {section === 'faq' && <FaqSection />}
        {section === 'donate' && <DonateSection />}
        {section === 'admin' && <AdminSection />}
        {section === 'privacy' && <PrivacySection />}
        {section === 'terms' && <TermsSection />}
        </div>
      </main>
      <SiteFooter onNavigate={setSection} />
      <ScrollToTop />
      <CommandPalette onNavigate={setSection} />
    </div>
  )
}
