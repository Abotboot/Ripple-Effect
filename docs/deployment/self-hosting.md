# Deploy Ripple without Netlify

Target domain: `arippleeffectinitiative.org`. The current code is a Next.js application with Node.js API routes and a PostgreSQL database, not a WordPress theme or a static export. The domain's Porkbun WordPress preview cannot run this application unchanged. DNS alone does not replace hosting.

## Server deployment

Use a host supporting a persistent Node.js process, HTTPS, environment variables, outbound PostgreSQL connectivity, and the project's full media directory. Build from the repository root:

```sh
npm ci
npm run build
npm start
```

`npm ci` runs the existing Prisma client-generation postinstall hook; it does not run database migrations or seed data. The installed Next.js version requires Node.js 20.9 or later. Use a host-supported maintained Node release. Set `PORT` to the host's assigned port and `NODE_ENV=production`. Put the application behind the host's HTTPS reverse proxy; forward all routes, including `/api/*`, `/_next/*`, `/media/*`, and `/motion-study`.

Runtime environment:

- `DATABASE_URL` and `DIRECT_URL`: current PostgreSQL connection settings, transferred through the selected host's secret settings. Never include these values in Git, browser bundles, or a public archive.
- `ROBOT_API_KEY`: preserve if robot submissions are enabled.
- `DISCORD_WEBHOOK_REPORTS` and `DISCORD_WEBHOOK_ALERTS`: preserve if those integrations are enabled.
- Keep `SEED_DEMO_DATA` unset or false. Do not run `db:push`, `db:reset`, `db:seed`, or migrations as part of this hosting move.

Admin accounts and sessions live in PostgreSQL. Moving the web server does not require changing that schema. Confirm the existing database remains usable independently of Netlify billing before cutover. If its hosting must also move, obtain a backup and agree on a separate database migration first. Existing browser cookies will not transfer to a different domain; users sign in again on the new domain.

## Cutover prerequisites

### Prepared free deployment

The existing Neon `Ripple` production branch contains the application's tables and is on the Free plan. Render's existing workspace has a Free web-service option. Prepared settings: service `arei-web`, Node runtime, GitHub `Abotboot/Ripple-Effect`, branch `main`, Ohio region, build `npm ci && npm run build`, start `npm start`, and `PORT=10000`. Credentials must be entered privately; they are not stored in this document.

Render Free sleeps after idle periods and shares workspace limits. At preparation the dashboard showed 750 instance hours, 5 GB bandwidth, 500 build minutes, and two included custom domains per month. This removes the Netlify dependency, not usage limits. No payment method or paid compute is needed for this configuration. Confirm deployment succeeds and the database connection works before changing DNS.

1. Select and authorize the replacement hosting account. No replacement hosting plan or subscription has been purchased.
2. Deploy this same application to the host's preview URL and securely configure its runtime environment.
3. Verify live search, utility details, session login, admin authorization, media range requests, intro/replay, and HTTPS. Local browser checks with stubbed APIs do not verify production database connectivity.
4. Save the existing DNS records, then change only the app's web records to the host's supplied destination. Preserve mail and unrelated records. Set up the root domain and `www` with a single canonical redirect after certificate issuance.
5. Verify public access independently of the WordPress administrator's session. The current Porkbun draft is unpublished and is not a working deployment of Ripple.

No DNS records, WordPress content, database records, or hosting subscriptions were changed during preparation.
