'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SiteHeader, type Section } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { ScrollToTop } from '@/components/site/scroll-to-top'
import { HomeSection } from '@/components/sections/home-section'
import { MicroplasticsSection } from '@/components/sections/microplastics-section'
import { DataSourcesSection } from '@/components/sections/data-sources-section'
import { CommunityReportsSection } from '@/components/sections/community-reports-section'
import { AdminSection } from '@/components/sections/admin-section'
import { MapSection } from '@/components/sections/map-section'
import { AboutSection } from '@/components/sections/about-section'
import { PartnershipsSection } from '@/components/sections/partnerships-section'
import { DonateSection } from '@/components/sections/donate-section'
import { DonationPageTransition } from '@/components/canvas-ui/donation-page-transition'
import { SubmitReadingSection } from '@/components/sections/submit-reading-section'
import { FaqSection } from '@/components/sections/faq-section'
import { CommandPalette } from '@/components/site/command-palette'

export default function Home() {
  const [section, setSection] = useState<Section>('home')
  const [donateOrigin, setDonateOrigin] = useState<{ x: number; y: number } | null>(null)

  const handleNavigate = (s: Section, origin?: { x: number; y: number }) => {
    if (s === 'donate' && origin) {
      setDonateOrigin(origin)
    }
    setSection(s)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader current={section} onNavigate={handleNavigate} />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: section === 'donate' ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {section === 'home' && <HomeSection onNavigate={handleNavigate} />}
            {section === 'map' && <MapSection />}
            {section === 'microplastics' && <MicroplasticsSection onNavigate={handleNavigate} />}
            {section === 'submit' && <SubmitReadingSection />}
            {section === 'sources' && <DataSourcesSection />}
            {section === 'reports' && <CommunityReportsSection />}
            {section === 'about' && <AboutSection onNavigate={handleNavigate} />}
            {section === 'partners' && <PartnershipsSection onNavigate={handleNavigate} />}
            {section === 'faq' && <FaqSection />}
            {section === 'donate' && (
              <DonationPageTransition key="donate-transition" origin={donateOrigin}>
                <DonateSection />
              </DonationPageTransition>
            )}
            {section === 'admin' && <AdminSection />}
          </motion.div>
        </AnimatePresence>
      </main>
      <SiteFooter onNavigate={handleNavigate} />
      <ScrollToTop />
      <CommandPalette onNavigate={handleNavigate} />
    </div>
  )
}
