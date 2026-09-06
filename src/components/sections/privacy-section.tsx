'use client'

import { Shield, Mail, Cookie, Database, UserCheck, Trash2 } from 'lucide-react'

const EMAIL = 'rippleeffectoffice@gmail.com'

export function PrivacySection() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
        {/* Introduction */}
        <div>
          <p>
            A Ripple Effect Initiative (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            operates the website at{' '}
            <span className="font-medium text-foreground">rippleeffecter.netlify.app</span>. We are
            committed to protecting your privacy and being transparent about the data we collect.
            This Privacy Policy explains what information we gather, how we use it, and your rights
            regarding that information.
          </p>
        </div>

        {/* What We Collect */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">What We Collect</h2>
          </div>
          <div className="space-y-3 ml-7">
            <div>
              <h3 className="font-semibold text-foreground">Water Alert Subscriptions</h3>
              <p>Email address and ZIP code &mdash; used solely to send you contaminant data alerts for your area.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Community Reports</h3>
              <p>Reporter name (optional), email (optional), ZIP code, city, state, and water quality observations. Reporter emails are <span className="font-medium text-foreground">never</span> included in public data exports.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Volunteer / Chapter Applications</h3>
              <p>Name, email, city, state, ZIP code, organization, and water body of interest.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Donations</h3>
              <p>Name (optional), email (optional), amount, and any message you include. Anonymous donations are respected.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Admin Accounts</h3>
              <p>Email and password (stored securely using scrypt hashing). A session cookie is used for authentication.</p>
            </div>
          </div>
        </div>

        {/* How We Use It */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">How We Use Your Data</h2>
          </div>
          <ul className="ml-7 list-disc space-y-1.5">
            <li>Send you water quality alerts when new data is published for your area</li>
            <li>Display community-submitted water quality reports (without email addresses)</li>
            <li>Process and acknowledge volunteer chapter applications</li>
            <li>Record and acknowledge donations</li>
            <li>Authenticate admin users for site management</li>
            <li>Improve the database and user experience</li>
          </ul>
          <p className="mt-3 ml-7 font-medium text-foreground">
            We do not sell, rent, or share your personal information with third parties for marketing purposes.
          </p>
        </div>

        {/* Cookies */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cookie className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Cookies</h2>
          </div>
          <div className="ml-7 space-y-2">
            <p>We use a single session cookie (<code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">ag_session</code>) for admin authentication. It expires after 12 hours.</p>
            <p>We do <span className="font-medium text-foreground">not</span> use any third-party analytics, tracking pixels, advertising cookies, or fingerprinting technologies.</p>
          </div>
        </div>

        {/* Data Storage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Data Storage &amp; Security</h2>
          </div>
          <div className="ml-7 space-y-2">
            <p>Your data is stored in our database hosted alongside the application. Passwords are hashed using the scrypt algorithm with salts and timing-safe comparison.</p>
            <p>The site is served over HTTPS with HSTS enabled. We use Content Security Policy, X-Frame-Options, and other security headers to protect against common web vulnerabilities.</p>
          </div>
        </div>

        {/* Your Rights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Your Rights</h2>
          </div>
          <div className="ml-7 space-y-2">
            <p>You have the right to:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><span className="font-medium text-foreground">Access</span> &mdash; Request a copy of the personal data we hold about you</li>
              <li><span className="font-medium text-foreground">Correction</span> &mdash; Ask us to correct inaccurate data</li>
              <li><span className="font-medium text-foreground">Deletion</span> &mdash; Ask us to delete your personal data</li>
              <li><span className="font-medium text-foreground">Unsubscribe</span> &mdash; Remove yourself from water alert emails at any time</li>
            </ul>
            <p>To exercise any of these rights, email us at{' '}
              <a href={`mailto:${EMAIL}`} className="font-medium text-primary hover:underline">{EMAIL}</a>.
            </p>
          </div>
        </div>

        {/* Open Data */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Open Data Exports</h2>
          </div>
          <p className="ml-7">
            Our public data export API strips all personal identifiers (email addresses, reporter contact info) before making data available. Only water quality measurements and anonymized community reports are included in exports.
          </p>
        </div>

        {/* Children */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">Children&apos;s Privacy</h2>
          <p className="ml-7">
            Our site is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it.
          </p>
        </div>

        {/* Changes */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">Changes to This Policy</h2>
          <p className="ml-7">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the site after changes constitutes acceptance of the new policy.
          </p>
        </div>

        {/* Contact */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Contact Us</h2>
          </div>
          <p className="ml-7">
            If you have questions about this Privacy Policy, email us at{' '}
            <a href={`mailto:${EMAIL}`} className="font-medium text-primary hover:underline">{EMAIL}</a>.
          </p>
        </div>
      </div>
    </section>
  )
}
