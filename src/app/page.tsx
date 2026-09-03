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
import { SubmitReadingSection } from '@/components/sections/submit-reading-section'
import { FaqSection } from '@/components/sections/faq-section'
import { CommandPalette } from '@/components/site/command-palette'

export default function Home() {
  const [section, setSection] = useState<Section>('home')

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader current={section} onNavigate={setSection} />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
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
          </motion.div>
        </AnimatePresence>
      </main>
      <SiteFooter onNavigate={setSection} />
      <ScrollToTop />
      <CommandPalette onNavigate={setSection} />
    </div>
  )
}
