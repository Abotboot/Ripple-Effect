'use client'

import { FileText, Mail, AlertTriangle } from 'lucide-react'

const EMAIL = 'rippleeffectoffice@gmail.com'

export function TermsSection() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
        {/* Acceptance */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the A Ripple Effect Initiative website
            (&ldquo;rippleeffecter.netlify.app&rdquo;), you agree to be bound by these Terms of
            Service. If you do not agree with any part of these terms, please do not use the site.
          </p>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service</h2>
          <p>
            A Ripple Effect Initiative is a community-built, open-source freshwater and
            microplastics database. We aggregate data from federal sources (EPA, EWG, USGS, WHO)
            and community-submitted readings to make water quality information searchable and
            accessible.
          </p>
        </div>

        {/* Data Disclaimer */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-foreground">3. Data Disclaimer</h2>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="font-medium text-foreground mb-2">Important:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Water quality data displayed on this site is <span className="font-medium text-foreground">illustrative and community-submitted</span>.</li>
              <li>Seeded (demo) measurements are simulated within ranges consistent with published literature and should <span className="font-medium text-foreground">not</span> be treated as verified water-quality data.</li>
              <li>Always verify water quality with your utility&apos;s Consumer Confidence Report (CCR).</li>
              <li>We are not responsible for decisions made based on data displayed on this site.</li>
              <li>Community-submitted (&ldquo;citizen&rdquo;) readings are clearly labeled and are not verified by professionals.</li>
            </ul>
          </div>
        </div>

        {/* User Submissions */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">4. User Submissions</h2>
          <p>
            By submitting water quality reports, volunteer applications, or other content to the
            site, you grant A Ripple Effect Initiative a non-exclusive, royalty-free license to use,
            display, and distribute that content as part of our open database. You represent that
            you have the right to submit such content and that it does not violate any laws.
          </p>
        </div>

        {/* Prohibited Use */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">5. Prohibited Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc ml-4 mt-2 space-y-1">
            <li>Submit intentionally false or misleading water quality data</li>
            <li>Attempt to gain unauthorized access to admin or other protected areas</li>
            <li>Use automated tools to scrape or overload the site</li>
            <li>Use the site for any unlawful purpose</li>
            <li>Interfere with or disrupt the site&apos;s operation</li>
          </ul>
        </div>

        {/* Open Source */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">6. Open Source</h2>
          <p>
            The source code for this project is publicly available on{' '}
            <a
              href="https://github.com/Abotboot/Ripple-Effect"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              GitHub
            </a>
            . The code is provided as-is. Contributions are welcome under the project&apos;s license terms.
          </p>
        </div>

        {/* Limitation of Liability */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">7. Limitation of Liability</h2>
          <p>
            A Ripple Effect Initiative and its volunteers provide this site and its data on an
            &ldquo;as-is&rdquo; basis without warranties of any kind, express or implied. We are
            not liable for any damages arising from your use of the site, reliance on its data, or
            inability to access the site.
          </p>
        </div>

        {/* Changes */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">8. Changes to Terms</h2>
          <p>
            We may update these Terms of Service at any time. Changes will be posted on this page.
            Your continued use of the site after changes constitutes acceptance of the updated terms.
          </p>
        </div>

        {/* Contact */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">9. Contact</h2>
          </div>
          <p>
            Questions about these terms? Email us at{' '}
            <a href={`mailto:${EMAIL}`} className="font-medium text-primary hover:underline">{EMAIL}</a>.
          </p>
        </div>
      </div>
    </section>
  )
}
