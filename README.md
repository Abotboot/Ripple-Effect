# RippleEffect

A community-built database for exploring tap-water contaminants and microplastics. Search by ZIP code, compare measurements with health guidelines, view trends, submit reports, and manage data through the admin dashboard.

Built with Next.js, TypeScript, Prisma, SQLite, and Tailwind CSS.

## Run locally

```bash
bun install
bun run db:push
bun run db:seed
bun run dev
```

Open [localhost:3000](http://localhost:3000).

> Seeded measurements are illustrative and should not be treated as verified water-quality data.

## How submitted readings get on the site

Readings from the public form and from the identifier device start hidden.
Each one gets a checklist (device signature, value against benchmarks and the
published history, outliers for its water, duplicates, pin on water, reporter
history), then **Jev**, TypeSafe AI's decision model, is asked whether to
publish, hold or reject it. Confident answers are applied; anything uncertain,
and anything failing a hard check, waits in the admin **Review queue**, where
admins can publish, reject or ask Jev again. Set `TYPESAFE_API_KEY` for Jev;
without it every submission waits for an admin. Code: `src/lib/reading-review.ts`.
