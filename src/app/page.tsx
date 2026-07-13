'use client'

import { useState } from 'react'
import { SiteHeader, type Section } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { ScrollToTop } from '@/components/site/scroll-to-top'
import { HomeSection } from '@/components/sections/home-section'
import { ContaminantExplorerSection } from '@/components/sections/contaminant-explorer-section'
import { MicroplasticsSection } from '@/components/sections/microplastics-section'
import { CommunityReportsSection } from '@/components/sections/community-reports-section'
import { AdminSection } from '@/components/sections/admin-section'
import { MapSection } from '@/components/sections/map-section'
import { VolunteerSection } from '@/components/sections/volunteer-section'

export default function Home() {
  const [section, setSection] = useState<Section>('home')

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader current={section} onNavigate={setSection} />
      <main className="flex-1">
        {section === 'home' && <HomeSection />}
        {section === 'map' && <MapSection />}
        {section === 'explorer' && <ContaminantExplorerSection />}
        {section === 'microplastics' && <MicroplasticsSection />}
        {section === 'reports' && <CommunityReportsSection />}
        {section === 'volunteer' && <VolunteerSection />}
        {section === 'admin' && <AdminSection />}
      </main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  )
}
