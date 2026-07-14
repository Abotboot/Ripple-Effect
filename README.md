# RippleEffect — Tap Water & Microplastics Database

A community-built tap water and microplastics database inspired by [EWG's Tap Water Database](https://www.ewg.org/tapwater/). Built for the **2026 Water Project** — a volunteer non-profit crew mapping microplastics and drinking water contaminants in their city (and eventually the world).

![RippleEffect](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-indigo) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## What this is

A full-stack web app that lets anyone:

- **Search by ZIP code** to find their water utility
- **See every contaminant** measured in their drinking water (lead, arsenic, PFAS, microplastics, disinfection byproducts, and more)
- **Compare against health guidelines** — not just legal limits (which are often 100–1000× higher than what's actually safe)
- **View trend charts** showing how contaminant levels change over time
- **Compare treated vs. untreated water** for microplastics (the project's main mission)
- **Submit community reports** about water quality issues
- **Admin dashboard** for managing utilities, contaminants, samples, and reports
- **Import/Export** the entire database as CSV or JSON

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Database**: Prisma ORM + SQLite (zero-config, file-based)
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide

## Quick start (local dev)

```bash
# 1. Install dependencies
bun install

# 2. Set up the database (SQLite file lives at db/custom.db)
bun run db:push     # create tables
bun run db:seed     # seed 10 US utilities, 12 contaminants, 490 samples, 5 reports

# 3. Start the dev server
bun run dev         # http://localhost:3000

# 4. Lint
bun run lint
```

## Default admin credentials

```
Email:    admin@rippleeffect.org
Password: rippleeffect2026
```

**Change these immediately in a real deployment** by editing `prisma/seed.ts` and re-running `bun run db:seed`, or by importing a new user via the admin Import tab.

---

## Deployment guide

This app uses **SQLite** (a single file at `db/custom.db`), which means you have full flexibility on where to host it. Three free options below, ranked by ease of setup.

### Option A — Netlify (RECOMMENDED for free hosting)

Netlify supports Next.js with serverless functions and persistent SQLite via their bundled storage.

1. **Push this project to GitHub** (see Option C below for the git setup).
2. Go to [netlify.com](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
3. Connect your GitHub repo.
4. Netlify auto-detects Next.js. Use these settings:
   - **Build command**: `bun install && bun run db:push && bun run db:seed && bun run build`
   - **Publish directory**: `.next`
   - **Environment variables**:
     - `DATABASE_URL` = `file:./db/custom.db`
5. Click **Deploy**.
6. Add the [Netlify Blobs](https://docs.netlify.com/blobs/overview/) or a persistent volume addon if you want the SQLite file to survive rebuilds. (For a volunteer project, re-seeding on each deploy is fine.)

> **Tip**: Netlify's free tier includes 100 GB-hours of serverless function invocation per month — plenty for a community database.

### Option B — Hugging Face Spaces

HF Spaces supports Docker-based Next.js apps. The free CPU tier works for low-traffic community sites.

1. Create a free account at [huggingface.co](https://huggingface.co).
2. Click **New Space** → SDK: **Docker** → visibility: **Public** (or Private).
3. Push this repo's files to the Space's git repo:
   ```bash
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/rippleeffect
   git push space main
   ```
4. Add a `Dockerfile` at the repo root (create one — example below):
   ```dockerfile
   FROM oven/bun:1 AS deps
   WORKDIR /app
   COPY package.json bun.lock ./
   RUN bun install --frozen-lockfile
   COPY . .
   RUN bun run db:push && bun run db:seed && bun run build

   FROM oven/bun:1 AS runner
   WORKDIR /app
   COPY --from=deps /app ./
   ENV DATABASE_URL=file:./db/custom.db
   ENV PORT=7860
   EXPOSE 7860
   CMD ["bun", "run", "start"]
   ```
5. HF will build and deploy. Your app will be at `https://YOUR_USERNAME-rippleeffect.hf.space`.

> **Note**: HF Spaces free tier sleeps after inactivity. The SQLite file persists in the container's writable `/data` layer, but a cold restart re-seeds the DB unless you configure a persistent volume.

### Option C — GitHub + any VPS (most control)

This is the most portable option. Once the code is on GitHub, you can deploy to any VPS (DigitalOcean, Railway, Fly.io, Render, a Raspberry Pi at home, etc.).

1. **Initialize git and push to GitHub**:
   ```bash
   cd /path/to/this/project
   git init
   git add .
   git commit -m "Initial commit: RippleEffect water database"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/rippleeffect.git
   git push -u origin main
   ```

2. **Make sure these files are NOT in `.gitignore`** (they should be committed):
   - `prisma/schema.prisma`
   - `prisma/seed.ts`
   - All `src/` source files

3. **Make sure these ARE in `.gitignore`** (don't commit them):
   - `node_modules/`
   - `db/custom.db` (your local data — each deploy should re-seed or mount its own)
   - `.env` (contains secrets)
   - `.next/` (build output)

4. **Deploy to your VPS** (example for Railway):
   - Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
   - Select your `rippleeffect` repo
   - Add a `DATABASE_URL` env var (Railway will give you a persistent volume path)
   - Railway auto-detects Next.js and runs `bun install && bun run build && bun run start`

> **For a $5/month DigitalOcean droplet**: SSH in, `git clone`, `bun install`, `bun run db:push && bun run db:seed`, then run `bun run start` behind nginx or Caddy.

---

## Database management

### Re-seed from scratch

```bash
rm db/custom.db          # delete the SQLite file
bun run db:push          # recreate schema
bun run db:seed          # re-seed
```

### Export data (via UI or API)

- **UI**: Log in as admin → **Admin** → **Import / Export** tab → pick table + format → Download
- **API**:
  ```bash
  curl -O "http://localhost:3000/api/export?format=csv&table=utilities"
  curl -O "http://localhost:3000/api/export?format=json&table=samples"
  ```

### Import data (via UI or API)

- **UI**: Admin → **Import / Export** → paste CSV/JSON or upload a file → Import
- **API**:
  ```bash
  curl -X POST http://localhost:3000/api/import \
    -H "Content-Type: application/json" \
    -d '{"table":"utilities","format":"json","content":"[{\"pwsid\":\"...\",\"name\":\"...\"}]"}'
  ```

> Importing utilities/contaminants **upserts** by PWSID/slug (updates existing, creates new). Samples/reports are always appended.

### Add a new utility manually

Admin → **Utilities** tab → **Add utility** → fill in PWSID, name, state, ZIP codes, etc.

---

## API reference

All endpoints are under `/api`. No auth required for reads; admin cookie required for writes.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats` | Aggregated dashboard stats |
| GET | `/api/utilities?q=` | Search utilities (ZIP, name, city, state, PWSID) |
| GET | `/api/utilities/:id` | Utility with contaminant summaries + trends |
| POST | `/api/utilities` | Create utility *(admin)* |
| PUT | `/api/utilities/:id` | Update utility *(admin)* |
| DELETE | `/api/utilities/:id` | Delete utility + samples *(admin)* |
| GET | `/api/contaminants` | List all contaminants |
| GET | `/api/contaminants/:id` | Contaminant with per-utility stats |
| GET | `/api/samples?utilityId=&contaminantId=` | List samples |
| POST | `/api/samples` | Add sample *(admin)* |
| DELETE | `/api/samples/:id` | Delete sample *(admin)* |
| GET | `/api/reports` | List community reports |
| POST | `/api/reports` | Submit a report *(public)* |
| PATCH | `/api/reports/:id` | Update report status *(admin)* |
| DELETE | `/api/reports/:id` | Delete report *(admin)* |
| GET | `/api/export?format=csv\|json&table=` | Download data |
| POST | `/api/import` | Import data *(admin)* |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current session |

---

## Project structure

```
prisma/
  schema.prisma          # Database schema (Utility, Contaminant, Sample, Report, User)
  seed.ts                # Seeds 10 US utilities + 12 contaminants + 490 samples
src/
  app/
    api/                 # All API routes (see reference above)
    page.tsx             # Single-page app with section state
    layout.tsx           # Root layout with metadata
    globals.css          # Tailwind + water-themed CSS variables
  components/
    site/                # Header, footer
    sections/            # Home, ContaminantExplorer, Microplastics, Community, Admin
    charts/              # Recharts bar + trend charts
    ui/                  # shadcn/ui components
  lib/
    db.ts                # Prisma client
    auth.ts              # Session + password hashing
    api.ts               # Client-side API helper
    types.ts             # Shared TypeScript types
    aggregate.ts         # Builds ContaminantSummary from Sample rows
```

---

## For the 2026 Water Project crew

This codebase is your starting point. Roles from the kickoff deck map cleanly:

- **Coders**: Maintain the website, add features (e.g. a map view, a "report contamination" widget for social media, a public dashboard for the city council). The code is heavily commented and uses a standard Next.js + Prisma stack — easy to pick up.
- **Engineers**: When you build the low-cost microplastics identifier, have it POST results to `/api/samples` (admin API key required). The database schema already has a `treatmentStatus` field (`Treated`/`Untreated`) and a `location` field (`Source Water Intake`, `Treatment Plant Outflow`, `Distribution Tap`) — perfect for comparing pre/post-treatment water.
- **Social media manager**: Use the **Community** tab to collect stories. Share exportable CSVs of microplastics data with journalists.
- **Public relations manager**: The **Admin → Export** tab gives you JSON/CSV of any table — handy for grant applications, city council presentations, and partner outreach.

### Suggested next features

1. **Map view** — plot utilities on a US map with Leaflet, colored by health exceedance count
2. **"Get involved" form** — collect volunteer signups directly into the database
3. **Public dashboard embed** — a read-only widget other sites can embed
4. **Email alerts** — notify subscribers when a utility's sample exceeds a threshold
5. **Mobile app** — the API is ready for a React Native or Expo frontend
6. **Multi-language** — add `next-intl` (already installed) for Spanish/other languages

---

## License & data

- **Code**: MIT — do whatever you want with it.
- **Data**: The seeded data is illustrative (real utility names, simulated sample levels). Replace it with your own measurements via the Import tab or by editing `prisma/seed.ts`.
- **Always cite your sources** when publishing water quality data — your utility's Consumer Confidence Report (CCR), EPA UCMR data, and peer-reviewed research.

Built with 💧 by the 2026 Water Project crew.
