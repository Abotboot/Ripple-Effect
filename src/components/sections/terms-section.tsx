'use client'

import { FileText, Mail, AlertTriangle, ShieldAlert, HeartHandshake, Scale, Stethoscope } from 'lucide-react'

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
        {/* 1. Acceptance & Eligibility */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms &amp; Eligibility</h2>
          <p>
            By accessing, browsing, submitting data to, or using the A Ripple Effect Initiative website
            (&ldquo;rippleeffecter.netlify.app&rdquo;, the &ldquo;Site&rdquo;, or &ldquo;Platform&rdquo;),
            you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree,
            you must immediately discontinue using this Platform.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Age Requirement:</strong> You must be at least 13 years of age to use this Site, submit water quality readings, or register for chapters or volunteer programs. If you are between 13 and 17 years old, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.
          </p>
        </div>

        {/* 2. Description of Service & Fiscal Sponsorship */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service &amp; Non-Profit Fiscal Sponsorship</h2>
          <p>
            A Ripple Effect Initiative is a community-driven, open-source environmental data platform.
            We aggregate publicly available federal and state water quality data (EPA SDWIS, EWG Tap Water Database, USGS, WHO)
            alongside volunteer-submitted citizen science readings to make freshwater and microplastics research accessible.
          </p>
          <p className="mt-2">
            A Ripple Effect Initiative is a fiscally sponsored project of <strong className="text-foreground">The Hack Foundation (dba Hack Club)</strong>, a 501(c)(3) public charity. Charitable contributions made through Hack Club Bank (HCB) are tax-deductible to the fullest extent permitted by U.S. law. Financial oversight and charitable 501(c)(3) status are administered by The Hack Foundation.
          </p>
        </div>

        {/* 3. Medical & Health Advice Disclaimer */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="h-5 w-5 text-rose-500" />
            <h2 className="text-xl font-bold text-foreground">3. Medical &amp; Health Advice Disclaimer</h2>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 space-y-2">
            <p className="font-semibold text-rose-900 dark:text-rose-100">
              NOT MEDICAL OR HEALTHCARE ADVICE
            </p>
            <p>
              The information, contaminant benchmarks, health effects summaries, and water safety scores provided on this Platform are for <strong>educational, informational, and community science research purposes only</strong>. Nothing contained on this Site is intended to be, nor should it be construed as, medical advice, clinical diagnosis, toxicological prognosis, or treatment recommendations.
            </p>
            <p>
              Contaminant health guidelines (e.g. from the Environmental Working Group, academic studies, or state advisory targets) represent aspirational scientific targets and do not establish a clinical diagnosis of illness or immediate physiological harm. Always consult a qualified physician, toxicologist, or healthcare provider with questions regarding your personal health or symptoms related to water consumption.
            </p>
          </div>
        </div>

        {/* 4. Safe Drinking Water Act & Utility Regulatory Compliance */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-foreground">4. Regulatory Compliance &amp; Utility Data Disclaimer</h2>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-2">
            <p className="font-semibold text-foreground">
              Independent Platform — No Official Government Affiliation
            </p>
            <ul className="list-disc ml-5 space-y-1.5">
              <li>
                A Ripple Effect Initiative is an independent open-source civic technology initiative. We are <strong>NOT affiliated with, endorsed by, or representing</strong> the U.S. Environmental Protection Agency (EPA), any state environmental protection department, the World Health Organization (WHO), or any municipal or private water utility.
              </li>
              <li>
                <strong>Legal Limits vs. Health Guidelines:</strong> Enforceable federal standards under the Safe Drinking Water Act (Maximum Contaminant Levels / MCLs) define legal drinking water compliance in the United States. Differences between non-enforceable scientific benchmarks (such as EWG Health Guidelines, California PHGs, or academic targets) and federal legal limits <strong>do not indicate that a utility is in violation of federal, state, or municipal law</strong>.
              </li>
              <li>
                Official compliance determinations can only be verified through your utility&apos;s annual official Consumer Confidence Report (CCR) or state regulatory compliance records.
              </li>
              <li>
                Utility safety scores and letter grades (A–F) displayed on this Site are mathematical aggregations designed to compare relative contaminant profiles and do not constitute an official regulatory audit.
              </li>
            </ul>
          </div>
        </div>

        {/* 5. Emergency & Boil Water Notices */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-bold text-foreground">5. No Reliance for Acute Emergencies</h2>
          </div>
          <p>
            <strong>DO NOT USE THIS PLATFORM FOR REAL-TIME EMERGENCIES:</strong> This Site does not provide real-time alert coverage for acute contamination events, chemical spills, water main breaks, or municipal Boil Water Advisories. If you suspect immediate contamination or are under a municipal advisory, immediately consult your local public health department, emergency management officials, and water utility.
          </p>
        </div>

        {/* 6. Citizen Science, Field Testing Kits & Hardware Safety */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">6. Field Testing Kits, Reagents &amp; Hardware Safety</h2>
          </div>
          <p>
            Any hardware designs, optical microplastics identifiers, circuit schematics, test protocols, reagents, or field testing kits provided, distributed, or documented by A Ripple Effect Initiative are for <strong>educational and community science exploration only</strong>.
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1.5">
            <li>
              Identifier devices and citizen test kits are <strong>NOT certified by the EPA, FDA, or NSF International</strong> as certified drinking water testing devices.
            </li>
            <li>
              Community-submitted (&ldquo;Citizen&rdquo;) readings are unverified exploratory observations. They must not be relied upon for regulatory, legal, real estate, commercial, or health-critical decisions.
            </li>
            <li>
              <strong>Field Safety:</strong> Volunteers and users collecting water samples or handling testing reagents do so entirely at their own risk. You must adhere to all chemical handling warnings, eye protection guidelines, and local environmental safety laws. A Ripple Effect Initiative assumes no responsibility or liability for chemical exposure, burns, glass cuts, falls, or property damage sustained during sample collection or testing.
            </li>
          </ul>
        </div>

        {/* 7. User Submissions & License */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">7. User Submissions &amp; Conduct</h2>
          <p>
            By submitting water quality readings, observations, volunteer applications, or notes to the Platform, you grant A Ripple Effect Initiative an irrevocable, perpetual, worldwide, royalty-free license to store, process, display, analyze, and publish that data as part of our open data releases.
          </p>
          <p className="mt-2">
            You agree and warrant that:
          </p>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>You will not submit false, fraudulent, fabricated, or intentionally misleading measurements or reports.</li>
            <li>You will not post defamatory, abusive, or unlawful remarks regarding any utility, company, or individual.</li>
            <li>You will not attempt to breach or circumvent administrative authentication or rate limits.</li>
            <li>You will not use automated scrapers, denial-of-service tools, or botnets against the Platform.</li>
          </ul>
        </div>

        {/* 8. Disclaimer of Warranties */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">8. Disclaimer of Warranties (&ldquo;AS-IS&rdquo;)</h2>
          <p className="uppercase text-xs font-semibold tracking-wider text-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
          <p className="mt-1">
            THE PLATFORM, DATA, DOCUMENTATION, HARDWARE DESIGNS, AND ALL CONTENT ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE DATA WILL BE ACCURATE, COMPLETE, RELIABLE, UNINTERRUPTED, OR FREE OF ERRORS OR MALICIOUS CODE.
          </p>
        </div>

        {/* 9. Limitation of Liability */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">9. Limitation of Liability &amp; Monetary Cap</h2>
          <p className="uppercase text-xs font-semibold tracking-wider text-foreground">
            MAXIMUM LIABILITY CAP:
          </p>
          <p className="mt-1">
            IN NO EVENT SHALL A RIPPLE EFFECT INITIATIVE, ITS FOUNDERS, VOLUNTEERS, CONTRIBUTORS, FISCAL SPONSOR (THE HACK FOUNDATION), OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES (INCLUDING LOSS OF DATA, MEDICAL COSTS, PROPERTY DAMAGE, FILTRATION EQUIPMENT EXPENSES, OR BODILY INJURY) ARISING OUT OF OR IN CONNECTION WITH YOUR ACCESS TO OR USE OF (OR INABILITY TO USE) THE PLATFORM OR ANY DATA THEREIN.
          </p>
          <p className="mt-2">
            IN ANY JURISDICTION WHERE LIMITATIONS OF LIABILITY ARE RESTRICTED, OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING UNDER OR RELATED TO THESE TERMS SHALL NOT EXCEED <strong className="text-foreground">$50.00 USD</strong> (OR THE AMOUNT YOU PAID TO US IN THE PAST TWELVE MONTHS, WHICHEVER IS GREATER).
          </p>
        </div>

        {/* 10. Indemnification */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">10. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless A Ripple Effect Initiative, its creators, volunteers, officers, and fiscal sponsor (The Hack Foundation) from and against any third-party claims, liabilities, losses, damages, costs, or legal expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your violation of these Terms; (b) any data, reading, or content you submit to the Platform; or (c) your sample collection or handling of testing equipment.
          </p>
        </div>

        {/* 11. Binding Arbitration & Class Action Waiver */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">11. Binding Individual Arbitration &amp; Class Action Waiver</h2>
          </div>
          <p className="font-semibold text-foreground">PLEASE READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS.</p>
          <p className="mt-2">
            <strong>Informal Dispute Resolution:</strong> Prior to filing any formal claim, you agree to contact us at <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a> and attempt in good faith to resolve the dispute informally for at least thirty (30) days.
          </p>
          <p className="mt-2">
            <strong>Binding Individual Arbitration:</strong> If the dispute cannot be resolved informally, any dispute, controversy, or claim arising out of or relating to these Terms or the Platform shall be resolved exclusively through final and binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules.
          </p>
          <p className="mt-2">
            <strong>CLASS ACTION WAIVER:</strong> YOU AND A RIPPLE EFFECT INITIATIVE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON&apos;S CLAIMS.
          </p>
        </div>

        {/* 12. Governing Law & Jurisdiction */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">12. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms of Service and any disputes arising out of or related to them shall be governed by and construed in accordance with the laws of the State of Texas, without regard to conflict of law principles. Any legal proceeding that is not subject to arbitration shall be brought exclusively in the state or federal courts located in Tarrant County or Dallas County, Texas, and you consent to personal jurisdiction therein.
          </p>
        </div>

        {/* 13. DMCA Copyright Notice & Takedown Policy */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">13. Digital Millennium Copyright Act (DMCA) Policy</h2>
          <p>
            We respect the intellectual property rights of others. If you believe that any content hosted on the Platform infringes your copyright under 17 U.S.C. § 512(c), please send a written notification to our Designated Copyright Agent at <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a> containing:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Identification of the copyrighted work claimed to have been infringed;</li>
            <li>Identification of the material on our Site that is claimed to be infringing with sufficient detail for us to locate it;</li>
            <li>Your contact information (name, mailing address, telephone number, email);</li>
            <li>A statement of good faith belief that the disputed use is not authorized by the copyright owner;</li>
            <li>A statement made under penalty of perjury that the information in your notice is accurate and that you are authorized to act on the copyright owner&apos;s behalf.</li>
          </ul>
        </div>

        {/* 14. Changes to Terms */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3">14. Modifications to Terms</h2>
          <p>
            We reserve the right to revise or update these Terms at any time. Changes become effective immediately upon posting. Your continued use of the Platform following any modifications constitutes your binding acceptance of the revised Terms.
          </p>
        </div>

        {/* 15. Contact */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">15. Contact &amp; Legal Notices</h2>
          </div>
          <p>
            For legal notices, compliance questions, or questions regarding these Terms, please contact our administrative team at:{' '}
            <a href={`mailto:${EMAIL}`} className="font-semibold text-primary hover:underline">{EMAIL}</a>.
          </p>
        </div>
      </div>
    </section>
  )
}
