'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Database, FlaskConical, HandHeart, Microscope, Wrench } from 'lucide-react'
import './editorial-pages.css'
import './donation.css'

const GOAL = 25_000
const HCB_DONATE_URL = 'https://hcb.hackclub.com/donations/start/a-ripple-effect-initiative-arei'
const HCB_ORG_API = 'https://hcb.hackclub.com/api/v3/organizations/a-ripple-effect-initiative-arei'
const HCB_SPONSORSHIP = 'https://help.hcb.hackclub.com/en/articles/15409723-what-is-fiscal-sponsorship-and-how-is-it-different-from-starting-my-own-501-c-3'

const ALLOCATIONS = [
  { icon: Wrench, title: 'Identifier parts & circuit boards', pct: 35 },
  { icon: Microscope, title: 'Field kits & sample supplies', pct: 30 },
  { icon: FlaskConical, title: 'Laboratory verification', pct: 25 },
  { icon: Database, title: 'Free, open data infrastructure', pct: 10 },
] as const

type Funding =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'available'; raised: number; checkedAt: string }

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function DonateSection() {
  const [funding, setFunding] = useState<Funding>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    void (async () => {
      try {
        const response = await fetch(HCB_ORG_API, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Funding source unavailable')
        const data: unknown = await response.json()
        const record = data as { balances?: { total_raised?: unknown }; demo_mode?: unknown } | null
        const cents = record?.balances?.total_raised
        if (record?.demo_mode === true || typeof cents !== 'number' || !Number.isFinite(cents) || cents < 0) {
          throw new Error('Funding total is not a usable live amount')
        }
        if (active) setFunding({ status: 'available', raised: cents / 100, checkedAt: new Date().toISOString() })
      } catch {
        // A failed, missing or malformed total is unavailable, never a false $0.
        if (active) setFunding({ status: 'unavailable' })
      } finally { clearTimeout(timeout) }
    })()
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [attempt])

  const retryFunding = () => { setFunding({ status: 'loading' }); setAttempt(value => value + 1) }
  const percentage = funding.status === 'available' ? Math.min(100, funding.raised / GOAL * 100) : null

  return <div className="editorial-page donation-page" data-testid="donation-page">
    <section className="donation-hero">
      <div className="donation-layout">
        <div className="donation-intro">
          <p className="donation-kicker"><HandHeart size={18} aria-hidden="true" /> Community-funded research</p>
          <h1>Better tools.<br /><em>Better water data.</em></h1>
          <p className="donation-lede">Help build and validate a low-cost microplastics identifier, then publish the observations it supports in an open data system.</p>
          <a className="donation-primary" href={HCB_DONATE_URL} target="_blank" rel="noopener noreferrer" data-testid="donation-primary">
            Donate to the project <ArrowUpRight size={20} aria-hidden="true" />
          </a>
          <p className="donation-provider">Checkout and donation receipts are handled by HCB.</p>
        </div>

        <div className="donation-funding" data-testid="donation-funding" data-state={funding.status} aria-busy={funding.status === 'loading'}>
          <div className="donation-funding-heading"><span>Build & validation fund</span><span>01 / Fieldwork</span></div>
          <p className="donation-total-label">Raised through HCB</p>
          <div className="donation-total" aria-live="polite" data-testid="donation-total">
            {funding.status === 'available' ? currency(funding.raised) : funding.status === 'loading' ? 'Loading total…' : 'Total unavailable'}
          </div>
          <div className="donation-goal"><span>Project goal</span><strong>{currency(GOAL)}</strong></div>
          {funding.status === 'available' && <>
            <progress className="donation-progress" max={GOAL} value={Math.min(GOAL, funding.raised)} aria-label={`${currency(funding.raised)} raised toward ${currency(GOAL)} goal`} />
            <div className="donation-funding-note"><span>{percentage!.toLocaleString('en-US', { maximumFractionDigits: 2 })}% of goal</span><time dateTime={funding.checkedAt}>Fetched from HCB</time></div>
          </>}
          {funding.status === 'unavailable' && <div className="donation-total-error" role="status">
            <p>The funding total could not be loaded. HCB checkout is still available.</p>
            <button type="button" onClick={retryFunding}>Retry total</button>
          </div>}
          <a className="donation-source" href={HCB_ORG_API} target="_blank" rel="noopener noreferrer">Inspect the public funding data <ArrowUpRight size={14} aria-hidden="true" /></a>
        </div>
      </div>
    </section>

    <section className="donation-details">
      <div>
        <p className="donation-kicker">The plan</p>
        <h2>From parts<br />to usable evidence.</h2>
        <p>Hardware is only the beginning. The project budget also plans for sample supplies, laboratory verification, and a database people can examine for themselves.</p>
        <p className="donation-sponsor">A Ripple Effect Initiative uses HCB for fiscal sponsorship and contribution processing. <a href={HCB_SPONSORSHIP} target="_blank" rel="noopener noreferrer">Read how fiscal sponsorship and fees work ↗</a></p>
      </div>
      <div className="donation-allocation" aria-label="Planned project allocation">
        <div className="donation-allocation-heading"><span>Planned allocation</span><span>Share of program budget</span></div>
        {ALLOCATIONS.map(({ icon: Icon, title, pct }) => <div className="donation-allocation-row" key={title}>
          <Icon size={20} aria-hidden="true" /><span>{title}</span><strong>{pct}%</strong>
        </div>)}
        <p>Planning targets, not a record of money already spent. Fiscal-sponsorship and payment fees are separate.</p>
      </div>
    </section>

    <section className="donation-checkout" aria-labelledby="donation-checkout-title">
      <div>
        <p className="donation-kicker">Take the next step</p>
        <h2 id="donation-checkout-title">Support the work.</h2>
        <p>Choose an amount, then review the recipient and amount in HCB checkout before submitting.</p>
      </div>
      <div className="donation-checkout-actions">
        <a className="donation-primary" href={HCB_DONATE_URL} target="_blank" rel="noopener noreferrer">Continue to HCB <ArrowUpRight size={18} aria-hidden="true" /></a>
        <button className="donation-embed-toggle" type="button" onClick={() => setShowForm(value => !value)} aria-expanded={showForm} aria-controls="donation-embedded-form">{showForm ? 'Hide embedded form' : 'Use the form on this page'}</button>
      </div>
      {showForm && <div id="donation-embedded-form" className="donation-embed">
        <iframe src={HCB_DONATE_URL} title="A Ripple Effect Initiative donation form on HCB" loading="lazy" />
        <p>Form not loading? <a href={HCB_DONATE_URL} target="_blank" rel="noopener noreferrer">Open HCB directly ↗</a></p>
      </div>}
    </section>
  </div>
}
