'use client'

import { Droplets, Heart, Github, Mail, MapPin } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand + mission */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-water-surface">
                <Droplets className="h-5 w-5 text-primary-foreground" />
              </span>
              <span className="text-lg font-extrabold tracking-tight">
                Ripple<span className="text-primary">Effect</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              A community-built tap water and microplastics database. Built by
              volunteers for our 2026 Water Project — making local water data
              open, searchable, and actionable.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>Community-sourced · Open data · Volunteer-run</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-foreground">
              Explore
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#search" className="text-muted-foreground hover:text-primary transition-colors">
                  Search by ZIP
                </a>
              </li>
              <li>
                <a href="#map" className="text-muted-foreground hover:text-primary transition-colors">
                  National map view
                </a>
              </li>
              <li>
                <a href="#contaminants" className="text-muted-foreground hover:text-primary transition-colors">
                  Contaminant catalog
                </a>
              </li>
              <li>
                <a href="#microplastics" className="text-muted-foreground hover:text-primary transition-colors">
                  Microplastics spotlight
                </a>
              </li>
              <li>
                <a href="#reports" className="text-muted-foreground hover:text-primary transition-colors">
                  Community reports
                </a>
              </li>
              <li>
                <a href="#volunteer" className="text-muted-foreground hover:text-primary transition-colors">
                  Get involved
                </a>
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
                <a
                  href="mailto:hello@rippleeffect.org"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" /> hello@rippleeffect.org
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
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
            © {new Date().getFullYear()} RippleEffect · Built with
            <Heart className="h-3 w-3 text-rose-500" /> by the 2026 Water Project crew
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
