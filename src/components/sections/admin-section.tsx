'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Lock, LogOut, Loader2, Download, Upload, Plus, Pencil, Trash2,
  ShieldCheck, Database, FileJson, FileSpreadsheet, CheckCircle2,
  AlertCircle, Building2, Megaphone, Heart, Mail, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Utility, Contaminant, Report, AdminUser, Volunteer } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AdminSection() {
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined)
  const { toast } = useToast()

  useEffect(() => {
    api.me().then((r) => setUser(r.user)).catch(() => setUser(null))
  }, [])

  const handleLogout = async () => {
    await api.logout()
    setUser(null)
    toast({ title: 'Logged out' })
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />
  }

  return (
    <div className="min-h-[80vh] bg-water-hero">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Admin header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Admin dashboard
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Logged in as <span className="font-medium text-foreground">{user.email}</span> · {user.role}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>

        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="reports" className="gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="utilities" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Utilities
            </TabsTrigger>
            <TabsTrigger value="contaminants" className="gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Contaminants
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              Volunteers
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <FileJson className="h-3.5 w-3.5" />
              Import / Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-4">
            <ReportsAdmin />
          </TabsContent>
          <TabsContent value="utilities" className="mt-4">
            <UtilitiesAdmin />
          </TabsContent>
          <TabsContent value="contaminants" className="mt-4">
            <ContaminantsAdmin />
          </TabsContent>
          <TabsContent value="volunteers" className="mt-4">
            <VolunteersAdmin />
          </TabsContent>
          <TabsContent value="data" className="mt-4">
            <DataAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ── Login ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [email, setEmail] = useState('admin@rippleeffect.org')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await api.login(email, password)
      toast({ title: `Welcome, ${user.name}` })
      onLogin(user)
    } catch (e) {
      toast({
        title: 'Login failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-water-hero px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-water-surface">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">Admin login</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to manage utilities, contaminants, and reports.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  <><Lock className="h-4 w-4" /> Sign in</>
                )}
              </Button>
            </form>
            <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo credentials</p>
              <p className="mt-1">Email: <code className="rounded bg-muted px-1">admin@rippleeffect.org</code></p>
              <p>Password: <code className="rounded bg-muted px-1">rippleeffect</code></p>
              <p className="mt-2 italic">Change this after first login in a real deployment.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ── Reports Admin ──────────────────────────────────────────────────────
function ReportsAdmin() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const { toast } = useToast()

  const load = () => api.listReports().then(setReports)
  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: string) => {
    try {
      await api.updateReportStatus(id, status)
      toast({ title: `Marked as ${status}` })
      load()
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  if (!reports) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Community reports ({reports.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : reports.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">
                  {r.zipCode} · {new Date(r.createdAt).toLocaleDateString()}
                </div>
                <div className="font-medium text-foreground">{r.title}</div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
              </div>
              <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── Utilities Admin ────────────────────────────────────────────────────
function UtilitiesAdmin() {
  const [utilities, setUtilities] = useState<Utility[] | null>(null)
  const [editing, setEditing] = useState<Utility | null>(null)
  const [showForm, setShowForm] = useState(false)
  const { toast } = useToast()

  const load = () => api.listUtilities().then(setUtilities)
  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this utility? This will also delete all its samples. This cannot be undone.')) return
    try {
      await api.deleteUtility(id)
      toast({ title: 'Utility deleted' })
      load()
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Utilities {utilities && `(${utilities.length})`}
        </CardTitle>
        <Button
          size="sm"
          onClick={() => { setEditing(null); setShowForm(true) }}
        >
          <Plus className="h-4 w-4" />
          Add utility
        </Button>
      </CardHeader>
      <CardContent>
        {!utilities ? (
          <Skeleton className="h-32 w-full" />
        ) : utilities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No utilities yet.</p>
        ) : (
          <div className="space-y-2">
            {utilities.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{u.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.city}, {u.state} · PWSID {u.pwsid} · pop. {u.population.toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => { setEditing(u); setShowForm(true) }}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:text-rose-700"
                    onClick={() => handleDelete(u.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <UtilityFormDialog
        open={showForm}
        utility={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load() }}
      />
    </Card>
  )
}

function UtilityFormDialog({
  open, utility, onClose, onSaved,
}: {
  open: boolean
  utility: Utility | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Utility>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setForm(utility ?? {
      pwsid: '', name: '', city: '', state: '', zipCodes: '', county: '',
      population: 0, systemType: 'Community', sourceType: 'Surface',
      treatmentStatus: 'Treated', latitude: null, longitude: null,
      website: '', notes: '',
    })
  }, [utility, open])

  const save = async () => {
    if (!form.pwsid || !form.name || !form.state) {
      toast({ title: 'PWSID, name, and state are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (utility) {
        await api.updateUtility(utility.id, form)
        toast({ title: 'Utility updated' })
      } else {
        await api.createUtility(form)
        toast({ title: 'Utility created' })
      }
      onSaved()
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{utility ? 'Edit utility' : 'Add utility'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <FormField label="PWSID *" value={form.pwsid ?? ''} onChange={(v) => setForm({ ...form, pwsid: v })} />
          <FormField label="State *" value={form.state ?? ''} onChange={(v) => setForm({ ...form, state: v.toUpperCase().slice(0, 2) })} />
          <div className="sm:col-span-2">
            <FormField label="Utility name *" value={form.name ?? ''} onChange={(v) => setForm({ ...form, name: v })} />
          </div>
          <FormField label="City" value={form.city ?? ''} onChange={(v) => setForm({ ...form, city: v })} />
          <FormField label="County" value={form.county ?? ''} onChange={(v) => setForm({ ...form, county: v })} />
          <div className="sm:col-span-2">
            <FormField label="ZIP codes (comma-separated)" value={form.zipCodes ?? ''} onChange={(v) => setForm({ ...form, zipCodes: v })} />
          </div>
          <FormField label="Population" type="number" value={String(form.population ?? 0)} onChange={(v) => setForm({ ...form, population: Number(v) })} />
          <FormField label="Website" value={form.website ?? ''} onChange={(v) => setForm({ ...form, website: v })} />
          <FormField label="Latitude" type="number" value={form.latitude ? String(form.latitude) : ''} onChange={(v) => setForm({ ...form, latitude: v ? Number(v) : null })} />
          <FormField label="Longitude" type="number" value={form.longitude ? String(form.longitude) : ''} onChange={(v) => setForm({ ...form, longitude: v ? Number(v) : null })} />
          <FormSelectField label="System type" value={form.systemType ?? 'Community'} onChange={(v) => setForm({ ...form, systemType: v })} options={['Community', 'Non-Transient Non-Community', 'Transient Non-Community']} />
          <FormSelectField label="Source type" value={form.sourceType ?? 'Surface'} onChange={(v) => setForm({ ...form, sourceType: v })} options={['Surface', 'Ground', 'Mixed']} />
          <FormSelectField label="Treatment status" value={form.treatmentStatus ?? 'Treated'} onChange={(v) => setForm({ ...form, treatmentStatus: v })} options={['Treated', 'Untreated', 'Mixed']} />
          <div className="sm:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {utility ? 'Save changes' : 'Create utility'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label, value, onChange, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function FormSelectField({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

// ── Contaminants Admin (read-only catalog display) ────────────────────
function ContaminantsAdmin() {
  const [contaminants, setContaminants] = useState<Contaminant[] | null>(null)
  useEffect(() => { api.listContaminants().then(setContaminants) }, [])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Contaminants catalog {contaminants && `(${contaminants.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!contaminants ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2">
            {contaminants.map((c) => (
              <div key={c.id} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.category} · {c.chemicalName ?? 'no formula'}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="bg-amber-50">
                      HG: {c.healthGuideline ?? '—'} {c.healthGuidelineUnit ?? ''}
                    </Badge>
                    <Badge variant="outline" className="bg-rose-50">
                      MCL: {c.legalLimit ?? '—'} {c.legalLimitUnit ?? ''}
                    </Badge>
                    {!c.regulated && (
                      <Badge variant="outline" className="bg-slate-100">Unregulated</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          To edit contaminant catalog entries, use the Import tab with a JSON export, or modify the seed file in <code>prisma/seed.ts</code>.
        </p>
      </CardContent>
    </Card>
  )
}

// ── Import / Export ────────────────────────────────────────────────────
function DataAdmin() {
  const [table, setTable] = useState<'utilities' | 'contaminants' | 'samples' | 'reports' | 'volunteers'>('utilities')
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('json')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const { toast } = useToast()

  const handleExport = (format: 'csv' | 'json') => {
    window.location.href = api.exportUrl(format, table)
    toast({ title: `Exporting ${table} as ${format.toUpperCase()}` })
  }

  const handleImport = async () => {
    if (!importText.trim()) {
      toast({ title: 'Paste data to import first', variant: 'destructive' })
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const r = await api.importData(table, importFormat, importText)
      setResult(r)
      toast({
        title: `Imported ${r.imported} ${table}`,
        description: r.errors.length ? `${r.errors.length} errors` : 'All rows succeeded',
        variant: r.errors.length ? 'destructive' : 'default',
      })
    } catch (e) {
      toast({
        title: 'Import failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" />
            Export data
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Download the entire database as CSV or JSON. Perfect for backups, sharing, or moving to another host.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Table</Label>
              <Select value={table} onValueChange={(v: typeof table) => setTable(v)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="contaminants">Contaminants</SelectItem>
                  <SelectItem value="samples">Samples</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="volunteers">Volunteers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleExport('csv')} variant="outline">
              <FileSpreadsheet className="h-4 w-4" />
              Download CSV
            </Button>
            <Button onClick={() => handleExport('json')} variant="outline">
              <FileJson className="h-4 w-4" />
              Download JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Import data
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Paste CSV or JSON content below. For utilities and contaminants, existing records (matched by PWSID or slug) will be updated; otherwise new records are created. For samples and reports, new rows are always appended.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Table</Label>
              <Select value={table} onValueChange={(v: typeof table) => setTable(v)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="contaminants">Contaminants</SelectItem>
                  <SelectItem value="samples">Samples</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="volunteers">Volunteers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Format</Label>
              <Select value={importFormat} onValueChange={(v: 'csv' | 'json') => setImportFormat(v)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">&nbsp;</Label>
              <input
                type="file"
                accept=".json,.csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const text = await f.text()
                  setImportText(text)
                  if (f.name.endsWith('.csv')) setImportFormat('csv')
                  if (f.name.endsWith('.json')) setImportFormat('json')
                }}
                className="block text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          </div>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={
              importFormat === 'json'
                ? '[\n  {"pwsid":"IL0316040","name":"City of Chicago",...}\n]'
                : 'pwsid,name,state,city\nIL0316040,City of Chicago,IL,Chicago'
            }
            rows={10}
            className="font-mono text-xs"
          />
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="h-4 w-4" /> Import {importFormat.toUpperCase()}</>
            )}
          </Button>

          {result && (
            <div className={cn(
              'rounded-lg border p-3 text-sm',
              result.errors.length
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            )}>
              <div className="flex items-center gap-2 font-medium">
                {result.errors.length ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                Imported {result.imported} {result.errors.length === 0 ? 'successfully' : `with ${result.errors.length} errors`}
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-32 overflow-y-auto text-xs space-y-0.5">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                  {result.errors.length > 20 && <li>...and {result.errors.length - 20} more</li>}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Volunteers Admin ───────────────────────────────────────────────────
function VolunteersAdmin() {
  const [volunteers, setVolunteers] = useState<Volunteer[] | null>(null)
  const { toast } = useToast()

  const load = () => api.listVolunteers().then(setVolunteers)
  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: string) => {
    try {
      await api.updateVolunteerStatus(id, status)
      toast({ title: `Marked as ${status}` })
      load()
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  if (!volunteers) {
    return <Skeleton className="h-64 w-full" />
  }

  const roleColors: Record<string, string> = {
    Engineering: 'bg-amber-100 text-amber-700',
    Coding: 'bg-teal-100 text-teal-700',
    'Social Media': 'bg-pink-100 text-pink-700',
    'Public Relations': 'bg-cyan-100 text-cyan-700',
    General: 'bg-slate-100 text-slate-700',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-primary" />
          Volunteer signups ({volunteers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {volunteers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No volunteer signups yet. Share the &quot;Get Involved&quot; page to start recruiting!
          </p>
        ) : volunteers.map((v) => (
          <div key={v.id} className="rounded-lg border border-border/60 bg-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-foreground">{v.name}</span>
                  <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', roleColors[v.role] ?? roleColors.General)}>
                    {v.role}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {v.email}
                  </span>
                  {v.zipCode && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {v.zipCode}{v.state ? `, ${v.state}` : ''} · {v.availability}
                    </span>
                  )}
                </div>
                {v.message && (
                  <p className="mt-1.5 text-xs italic text-muted-foreground line-clamp-2">
                    &ldquo;{v.message}&rdquo;
                  </p>
                )}
                {v.skills && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Skills:</span> {v.skills}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Select value={v.status} onValueChange={(s) => setStatus(v.id, s)}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="onboarded">Onboarded</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
