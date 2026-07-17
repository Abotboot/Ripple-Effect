'use client'

import { useState } from 'react'
import { SiteHeader, type Section } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { ScrollToTop } from '@/components/site/scroll-to-top'
import { HomeSection } from '@/components/sections/home-section'
import { ContaminantExplorerSection } from '@/components/sections/contaminant-explorer-section'
import { MicroplasticsSection } from '@/components/sections/microplastics-section'
import { PlasticsSection } from '@/components/sections/plastics-section'
import { DataSourcesSection } from '@/components/sections/data-sources-section'
import { CommunityReportsSection } from '@/components/sections/community-reports-section'
import { AdminSection } from '@/components/sections/admin-section'
import { MapSection } from '@/components/sections/map-section'
import { ChapterSection } from '@/components/sections/chapter-section'
import { AboutSection } from '@/components/sections/about-section'
import { DonateSection } from '@/components/sections/donate-section'
import { CompareSection } from '@/components/sections/compare-section'
import { LeaderboardSection } from '@/components/sections/leaderboard-section'
import { SubmitReadingSection } from '@/components/sections/submit-reading-section'
import { GlossarySection } from '@/components/sections/glossary-section'
import { DashboardSection } from '@/components/sections/dashboard-section'
import { FaqSection } from '@/components/sections/faq-section'
import { TreatmentTipsSection } from '@/components/sections/treatment-tips-section'
import { CommandPalette } from '@/components/site/command-palette'

export default function Home() {
  const [section, setSection] = useState<Section>('home')

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader current={section} onNavigate={setSection} />
      <main className="flex-1">
        {section === 'home' && <HomeSection onNavigate={setSection} />}
        {section === 'map' && <MapSection />}
        {section === 'explorer' && <ContaminantExplorerSection />}
        {section === 'microplastics' && <MicroplasticsSection onNavigate={setSection} />}
        {section === 'plastics' && <PlasticsSection />}
        {section === 'compare' && <CompareSection />}
        {section === 'submit' && <SubmitReadingSection />}
        {section === 'sources' && <DataSourcesSection />}
        {section === 'reports' && <CommunityReportsSection />}
        {section === 'chapter' && <ChapterSection />}
        {section === 'leaderboard' && <LeaderboardSection />}
        {section === 'dashboard' && <DashboardSection />}
        {section === 'about' && <AboutSection onNavigate={setSection} />}
        {section === 'glossary' && <GlossarySection />}
        {section === 'faq' && <FaqSection />}
        {section === 'treatment' && <TreatmentTipsSection />}
        {section === 'donate' && <DonateSection />}
        {section === 'admin' && <AdminSection />}
      </main>
      <SiteFooter onNavigate={setSection} />
      <ScrollToTop />
      <CommandPalette onNavigate={setSection} />
    </div>
  )
}
