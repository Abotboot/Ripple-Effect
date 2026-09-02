'use client'

import { Droplets, Heart, Github, Mail, MapPin, Instagram, HandHeart } from 'lucide-react'
import type { Section } from '@/components/site/site-header'

const REPO_URL = 'https://github.com/Abotboot/Ripple-Effect'

export function SiteFooter({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const go = (s: Section) => {
    onNavigate?.(s)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand + mission */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="A Ripple Effect Initiative logo"
                className="h-10 w-10 rounded-full object-cover ring-1 ring-primary/30"
              />
              <span className="text-lg font-extrabold tracking-tight">
                A Ripple<span className="text-primary"> Effect</span>
                <span className="ml-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Initiative</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              A community-built freshwater and microplastics database. Built by
                            volunteers to make data about our
                            rivers, lakes, and streams open, searchable, and actionable.
                            Almost no public water database tracks microplastics — we do.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>Community-sourced · Open data · Volunteer-run · Open source</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-foreground">
              Explore
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button onClick={() => go('home')} className="text-muted-foreground hover:text-primary transition-colors">
                  Search by ZIP
                </button>
              </li>
              <li>
                <button onClick={() => go('map')} className="text-muted-foreground hover:text-primary transition-colors">
                  National map view
                </button>
              </li>
              <li>
                <button onClick={() => go('microplastics')} className="text-muted-foreground hover:text-primary transition-colors">
                  Microplastics, plastics &amp; filters
                </button>
              </li>
              <li>
                <button onClick={() => go('submit')} className="text-muted-foreground hover:text-primary transition-colors">
                  Submit a reading
                </button>
              </li>
              <li>
                <button onClick={() => go('sources')} className="text-muted-foreground hover:text-primary transition-colors">
                  Integrated data sources
                </button>
              </li>
              <li>
                              <button onClick={() => go('about')} className="text-muted-foreground hover:text-primary transition-colors">
                                About us
                              </button>
                            </li>
                            <li>
                              <button onClick={() => go('partners')} className="text-muted-foreground hover:text-primary transition-colors">
                                Partnerships
                              </button>
                            </li>
              <li>
                <button onClick={() => go('faq')} className="text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-foreground">
              Connect
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button
                  onClick={() => go('donate')}
                  className="inline-flex items-center gap-1.5 font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 transition-colors"
                >
                  <HandHeart className="h-3.5 w-3.5" /> Donate / Support
                </button>
              </li>
              <li>
                <a
                  href="mailto:rippleeffectoffice@gmail.com"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" /> rippleeffectoffice@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/rippleeffectoffice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Instagram className="h-3.5 w-3.5" /> @rippleeffectoffice
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@ripple.effect82"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                  @ripple.effect82
                </a>
              </li>
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Github className="h-3.5 w-3.5" /> Source on GitHub
                </a>
              </li>
              <li>
                <a
                  href="/api/export?format=json&table=utilities"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Droplets className="h-3.5 w-3.5" /> Download open data
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-1.5">
            © {new Date().getFullYear()} A Ripple Effect Initiative · Built with
                        <Heart className="h-3 w-3 text-rose-500" /> by the crew
          </p>
          <p>
            Data is illustrative and community-submitted. Always verify with your
            utility&apos;s Consumer Confidence Report.
          </p>
        </div>
      </div>
    </footer>
  )
}
