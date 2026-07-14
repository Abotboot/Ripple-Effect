'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Heart, Loader2, Send, Wrench, Code, Megaphone, Handshake,
  CheckCircle2, Users, Calendar, Sparkles, Mail, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const ROLES = [
  {
    id: 'Engineering',
    icon: Wrench,
    title: 'Engineers',
    description: 'Design and build the low-cost microplastics identifier. Create innovative solutions for complicated problems. CAD work, hardware prototyping, and field testing.',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    id: 'Coding',
    icon: Code,
    title: 'Coders',
    description: 'Maintain and extend this very website. Build data visualizations, integrate the identifier device, and innovate on how we present water data to the world.',
    color: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  {
    id: 'Social Media',
    icon: Megaphone,
    title: 'Social Media',
    description: 'Handle the public image of our organization. Find new ways to push ideas, raise awareness, and grow our following across platforms.',
    color: 'bg-pink-100 text-pink-700 border-pink-200',
  },
  {
    id: 'Public Relations',
    icon: Handshake,
    title: 'Public Relations',
    description: 'Talk to other organizations, find mentors, pull in funding, and find events we can attend to raise awareness and get donations.',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
]

const AVAILABILITY = ['Weeknights only', 'Weekends only', 'Flexible', 'A few hours/week', 'Full-time available']

export function VolunteerSection() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    zipCode: '',
    city: '',
    state: '',
    role: 'General',
    skills: '',
    availability: 'Flexible',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and email are required.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await api.submitVolunteer(form)
      toast({
        title: 'Welcome aboard! 🎉',
        description: 'Thanks for joining. The crew will reach out to you soon.',
      })
      setSubmitted(true)
      setForm({
        name: '', email: '', zipCode: '', city: '', state: '',
        role: 'General', skills: '', availability: 'Flexible', message: '',
      })
    } catch (e) {
      toast({
        title: 'Submission failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-water-hero min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-water-surface text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-20 right-[5%] h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-[20%] h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/30 bg-white/15 text-white hover:bg-white/15">
              <Heart className="mr-1 h-3 w-3" />
              Join the crew
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Help us map every drop
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              We&apos;re a volunteer crew building a community water database.
              Whether you&apos;re a student, engineer, coder, or just passionate
              about clean water — there&apos;s a role for you.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Mondays 6:30 PM (virtual)
              </span>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                All experience levels welcome
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Role cards */}
        <div className="mb-10">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Open roles
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            Pick the one that fits you. You can always switch later.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {ROLES.map(({ id, icon: Icon, title, description, color }, i) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className={cn(
                    'h-full cursor-pointer overflow-hidden transition-all hover:shadow-md',
                    form.role === id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/40'
                  )}
                  onClick={() => setForm({ ...form, role: id })}
                >
                  <CardContent className="flex h-full gap-4 p-5">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        {form.role === id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Signup form */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4 text-primary" />
                Sign up to join
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fill this out and our crew lead will reach out within a week.
              </p>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-emerald-900">You&apos;re in! 🎉</h3>
                  <p className="mt-1 max-w-sm text-sm text-emerald-800">
                    Thanks for joining the 2026 Water Project. We&apos;ll email you
                    with next steps and an invite to our next Monday meeting.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    onClick={() => setSubmitted(false)}
                  >
                    Sign up another person
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="vname" className="text-xs">Name *</Label>
                      <Input
                        id="vname"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Jane Doe"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="vemail" className="text-xs">Email *</Label>
                      <Input
                        id="vemail"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="jane@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="vzip" className="text-xs">ZIP code</Label>
                      <Input
                        id="vzip"
                        value={form.zipCode}
                        onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                        placeholder="60614"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vcity" className="text-xs">City</Label>
                      <Input
                        id="vcity"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="Chicago"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vstate" className="text-xs">State</Label>
                      <Input
                        id="vstate"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="IL"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vrole" className="text-xs">Preferred role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger id="vrole"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Coding">Coding</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="Public Relations">Public Relations</SelectItem>
                        <SelectItem value="General">General / Not sure yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vavail" className="text-xs">Availability</Label>
                    <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
                      <SelectTrigger id="vavail"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AVAILABILITY.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vskills" className="text-xs">Skills (optional)</Label>
                    <Input
                      id="vskills"
                      value={form.skills}
                      onChange={(e) => setForm({ ...form, skills: e.target.value })}
                      placeholder="e.g. Python, CAD, social media, lab work, graphic design"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vmsg" className="text-xs">Why do you want to join? (optional)</Label>
                    <Textarea
                      id="vmsg"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us what draws you to the project..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Join the crew</>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    By signing up, you agree to be contacted by the 2026 Water
                    Project crew. We never share your info.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Side info */}
          <div className="space-y-4">
            <Card className="bg-water-surface text-primary-foreground">
              <CardContent className="p-5">
                <Sparkles className="h-6 w-6 text-white/90" />
                <h3 className="mt-2 text-base font-semibold">What you get</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Work on a project that supports your community</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Build a real project for your resume</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Earn extracurricular experience (great for college apps)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Connect with mentors and other volunteers</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <Calendar className="h-6 w-6 text-primary" />
                <h3 className="mt-2 text-base font-semibold">Meeting info</h3>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">Every Monday</div>
                      <div className="text-muted-foreground">6:30 PM (when school is in session)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">Virtual</div>
                      <div className="text-muted-foreground">Video call link sent via email</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">Questions?</div>
                      <a href="mailto:hello@rippleeffect.org" className="text-primary hover:underline">
                        hello@rippleeffect.org
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
