'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { flushSync } from 'react-dom'
import '@/components/site/tank-system.css'
import { SmoothCurrent, glideToTop, jumpToTop } from '@/components/atmosphere/smooth-current'
import { MotionSystem } from '@/components/motion/motion-system'
import { SiteHeader, type Section } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { ScrollToTop } from '@/components/site/scroll-to-top'
import { HomeSection } from '@/components/sections/home-section'
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

// The lighter pages load on demand too, so they stay out of Home's first
// load; they are fetched quietly once the browser is idle (see below).
const loadSources = () => import('@/components/sections/data-sources-section')
const loadReports = () => import('@/components/sections/community-reports-section')
const loadAbout = () => import('@/components/sections/about-section')
const loadPartners = () => import('@/components/sections/partnerships-section')
const loadDonate = () => import('@/components/sections/donate-section')
const loadFaq = () => import('@/components/sections/faq-section')
const loadPrivacy = () => import('@/components/sections/privacy-section')
const loadTerms = () => import('@/components/sections/terms-section')
const DataSourcesSection = dynamic(() => loadSources().then(m => m.DataSourcesSection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })
const CommunityReportsSection = dynamic(() => loadReports().then(m => m.CommunityReportsSection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })
const AboutSection = dynamic(() => loadAbout().then(m => m.AboutSection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })
const PartnershipsSection = dynamic(() => loadPartners().then(m => m.PartnershipsSection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })
const DonateSection = dynamic(() => loadDonate().then(m => m.DonateSection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })
const FaqSection = dynamic(() => loadFaq().then(m => m.FaqSection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })
const PrivacySection = dynamic(() => loadPrivacy().then(m => m.PrivacySection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })
const TermsSection = dynamic(() => loadTerms().then(m => m.TermsSection), { ssr: false, loading: () => <SectionFallback label="Loading..." /> })

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

// Memoized so navigation and hash changes do not re-render them: Home in
// particular is large, and it stays mounted while other sections show.
const ParkedHome = memo(HomeSection)
const Footer = memo(SiteFooter)
const Palette = memo(CommandPalette)

export default function Home() {
  const [section, setSectionState] = useState<Section>('home')
  // Each section change fades the new section up gently (not on first load).
  const [stageMotion, setStageMotion] = useState(false)
  // Home is heavy to build (hero particles, the bottle story, the atlas), so it
  // stays mounted and is parked, not destroyed, while another section shows.
  const homeStage = useRef<HTMLDivElement>(null)
  useEffect(() => { homeStage.current?.toggleAttribute('inert', section !== 'home') }, [section])
  // Fetch the on-demand pages once the browser is idle, so switching to one
  // later needs no download.
  useEffect(() => {
    const prefetch = () => { for (const load of [loadAbout, loadPartners, loadFaq, loadSources, loadReports, loadDonate, loadPrivacy, loadTerms]) load().catch(() => {}) }
    const idle = window.requestIdleCallback?.(prefetch, { timeout: 4000 }) ?? window.setTimeout(prefetch, 2500)
    return () => { if (window.cancelIdleCallback) window.cancelIdleCallback(idle); else clearTimeout(idle) }
  }, [])

  // The current section, for a navigation callback that never changes identity.
  const currentSection = useRef<Section>('home')
  useEffect(() => { currentSection.current = section }, [section])

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


  const setSection = useCallback((next: Section) => {
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
    if (next === currentSection.current) {
      glideToTop()
      return
    }
    flushSync(() => {
      setStageMotion(!matchMedia('(prefers-reduced-motion: reduce)').matches)
      setSectionState(next)
    })
    syncHash()
    jumpToTop()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SmoothCurrent />
      <MotionSystem />
      <SiteHeader current={section} onNavigate={setSection} />
      <main className="flex-1">
        {/* Home returns instantly, without a fade: fading the whole page at
            once forces one huge offscreen layer for the length of the fade. */}
        <div ref={homeStage} className={section !== 'home' ? 'section-parked' : undefined} aria-hidden={section !== 'home' || undefined}>
          <ParkedHome onNavigate={setSection} />
        </div>
        {section !== 'home' && <div key={section} className={stageMotion ? 'section-stage' : undefined}>
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
        </div>}
      </main>
      <Footer onNavigate={setSection} />
      <ScrollToTop />
      <Palette onNavigate={setSection} />
    </div>
  )
}
