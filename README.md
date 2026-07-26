# Worldiqo

A live global event monitor — real news, real coordinates, real time. Built with
Next.js 16 (App Router) + TypeScript, no dummy data anywhere.

## Run it

The live map/feed/charts (Phase 0) work with zero setup:

```bash
npm install
npm run dev
```

Accounts, admin, alerts, and billing (Phases 1–5) need MongoDB running as a
replica set and a couple of env vars first — see "Phase 1: Database" below,
it's a five-minute one-time setup.

> **If pins don't appear:** your network needs to reach `api.gdeltproject.org`. GDELT
> is a free public service with no auth, so this only fails if a firewall/proxy is
> blocking it. The UI will show a small "⚠ source degraded" note in the top bar and
> the browser console/server log will show the underlying error.

## What's real here

Every number, pin, headline, and chart comes from live public sources — no
mock data, no seed files.

### News (map, feed, charts)

Two independent sources back the feed, switchable from the sidebar
("Source: Auto / GDELT / RSS"):

- **GDELT** (primary, and the only one with map coordinates) — the
  [GDELT Project](https://www.gdeltproject.org/), a free, keyless monitor of
  global news media in 100+ languages, refreshed every 15 minutes.
- **RSS** (fallback) — nine major outlets across different regions: BBC
  World (UK), Al Jazeera (Qatar), NPR (US), The Guardian (UK), DW (Germany),
  France24 (France), Euronews (Europe), Times of India (India), CBC (Canada).
  No map pins (RSS doesn't carry coordinates), but fully independent of
  GDELT — useful if GDELT is slow, rate-limited, or blocked on your network,
  and the wider geographic spread of outlets means a country-specific search
  is more likely to actually surface something.

**"Auto" mode (the default)** tries GDELT first; if it returns fewer than 5
articles — including if GDELT errored entirely — it also fetches RSS and
merges the two, de-duplicated by URL. The top bar shows which source(s)
actually contributed (`via gdelt`, `via rss`, or `via gdelt + rss`), and any
fetch errors are shown inline in the feed panel rather than hidden.

The **"Coverage volume over time"** and **"Top source countries"** charts are
computed directly from whatever's in the feed at the time (bucketed by hour,
counted by each article's source country) — not a separate API call — so
they can't go empty independently of the feed the way they used to.

The map now colors each pin by a best-guess topic (keyword-matched against
the article snippets GDELT attaches to each location) when you're viewing
"All signals" — a legend appears in the bottom-left when this is active.
Click a pin for a small popup listing up to 5 articles from that location,
not just one.

If **both** news sources come back empty with errors shown, that's a network
problem, not a code problem — check that your machine can reach
`api.gdeltproject.org` and the RSS domains; a firewall, VPN, or corporate
proxy blocking outbound requests to news domains is the most common cause.

### Markets (currencies, gold, silver)

A second mode, switchable at the top of the sidebar ("News" / "Markets"):

- **Currencies** — live rates and historical charts (1W–5Y or full history
  back to 1999) via [Frankfurter](https://frankfurter.dev), a free, keyless
  API built on the European Central Bank's daily reference rates.
- **Gold & Silver** — live spot price in ~19 currencies via
  [gold-api.com](https://gold-api.com) (free, keyless, no rate limit on the
  live-price endpoint), plus a historical chart (always USD) sourced from
  [Stooq's](https://stooq.com) public CSV export — the same free, keyless
  endpoint tools like `pandas-datareader` use under the hood. Stooq doesn't
  publish this as an official API and has been known to add anti-bot
  measures, so treat the historical chart as best-effort: if it's ever
  unavailable, the live price still works independently and the chart shows
  a clear error instead of silently failing.

- **`GET /api/markets/fx`** — `?base=USD` for latest rates + supported
  currencies; add `&target=EUR&timeframe=1y&history=1` for a historical series.
- **`GET /api/markets/metals`** — `?currency=EUR` for live gold+silver spot;
  add `&symbol=XAU&timeframe=5y&history=1` for historical closes.

### Routes

- **`GET /api/events`** — proxies GDELT's DOC 2.0 API (`mode=artlist`) for
  the live headline feed, GDELT's GEO 2.0 API (`format=geojson`) for map
  pins, and/or the RSS fallback in `src/lib/rss.ts`. Params: `category`, `q`
  (free text), `timespan` (`1h`/`6h`/`12h`/`24h`/`3d`), `source`
  (`auto`/`gdelt`/`rss`).
- All of this runs server-side so the browser never talks to these APIs
  directly — avoids CORS and gives us one place to add caching/rate-limiting
  later.

"Category" filters (conflict, disaster, protest, economy, politics, technology,
health) are implemented as curated GDELT boolean queries in `src/lib/gdelt.ts` — GDELT
itself doesn't pre-label categories, so this is the same approach real news-monitoring
tools use: keyword/theme queries, not a fixed taxonomy.

## Project structure

```
src/
├─ app/
│  ├─ page.tsx              # dashboard shell, polling, state
│  ├─ layout.tsx            # fonts, metadata
│  ├─ globals.css           # design tokens, map theme, animations
│  └─ api/
│     ├─ events/route.ts    # articles + geo pins
│     └─ timeline/route.ts  # volume-over-time series
├─ components/
│  ├─ WorldMap.tsx           # react-leaflet, dark CARTO basemap, pulsing markers
│  ├─ FilterRail.tsx         # category / search / time-window controls
│  ├─ EventFeed.tsx          # live scrolling headline list
│  ├─ ChartsPanel.tsx        # recharts: volume timeline + top source countries
│  └─ TopBar.tsx             # live UTC clock, counters, status
└─ lib/
   ├─ gdelt.ts               # GDELT client, category→query mapping, normalization
   └─ types.ts               # shared types
```

## Deploying

Works on Vercel with zero config (`vercel deploy`) — it's a standard Next.js app,
no database or secrets required for v1.

## Phase 1: Database (done)

Prisma on top of MongoDB (matches the original MERN plan). Schema lives in
`prisma/schema.prisma`: `User`/`Account`/`Session`/`VerificationToken` (what
Auth.js needs) plus `SavedSearch` (Phase 4).

**Requirement: MongoDB must run as a replica set** — even a single local
node. This isn't optional; Prisma's MongoDB connector uses transactions
internally, which plain standalone MongoDB doesn't support. If you already
have MongoDB running standalone (e.g. installed via `mongodb-bin` on Arch/
Manjaro), converting it is a one-time, non-destructive change:

```bash
# 1. Edit your MongoDB config (Arch/Manjaro: /etc/mongodb.conf) and add:
#      replication:
#        replSetName: rs0
sudo systemctl restart mongodb

# 2. Initiate the (single-node) replica set — only needed once, ever:
mongosh --eval "rs.initiate()"

# 3. Confirm it took:
mongosh --eval "rs.status().ok"   # should print 1
```

Setup from there:

```bash
npm install              # runs `prisma generate` automatically
npx prisma db push       # syncs the schema — creates collections/indexes
```

`DATABASE_URL` in `.env` already points at `mongodb://127.0.0.1:27017/worldiqo?replicaSet=rs0&directConnection=true`
— change the host/port/db name if yours differs. For a hosted MongoDB Atlas
cluster instead, Atlas clusters are already replica sets by default, so just
swap in your Atlas connection string — no `replicaSet=rs0` param needed
there, Atlas's own SRV connection string handles it.

## Phase 2: Auth (done)

Auth.js (NextAuth v5) with email + password (Credentials provider, bcrypt-hashed,
via the Prisma adapter from Phase 1). Google OAuth is wired up but optional — it
only activates if you set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

- `/signup` — create an account
- `/login` — sign in
- Sign-in status lives in the top bar (sign in link, or email + sign out once
  logged in)
- `src/auth.ts` is the single source of truth for auth config — session strategy
  is JWT (required for Credentials-based login), and the JWT/session carry a
  `role` field (`"user"` by default) that Phase 3's admin gate checks.

Setup: nothing extra beyond Phase 1 — `AUTH_SECRET` is already in `.env.example`
(generate your own for production with `npx auth secret`, don't reuse the sample).

To make yourself an admin locally: sign up normally, then run
`npx prisma studio`, open the `User` table, and change your row's `role` to
`admin`.

## Phase 3: Admin dashboard (done)

`/admin` is a route group gated in `src/app/admin/layout.tsx` — it checks the
session server-side and redirects anyone who isn't signed in (to `/login`) or
isn't an admin (to `/`). Every mutation also re-checks the role inside the server
action itself (`src/lib/actions/admin.ts`), so the page gate isn't the only line
of defense.

- **`/admin`** — live counts (total users, admins, signups in the last 24h)
  straight from the database, no placeholders
- **`/admin/users`** — full user table; promote/revoke admin, delete accounts
  (both run as Next.js Server Actions, no separate API round trip)
- You can't demote or delete yourself from the table — prevents accidentally
  locking yourself out

To get in: sign up normally, then use `npx prisma studio` to flip your `role`
to `admin` (same step mentioned in Phase 2) — after that, an "Admin" link
appears in the top bar automatically.

## Phase 4: Alerts (done)

Saved searches that get re-checked on a schedule and emailed as a digest when
there's new coverage.

- **"Save as alert"** button in the dashboard's filter rail captures your
  current category/search/time-window (shown only when signed in)
- **`/alerts`** — manage saved searches: pause, resume, delete
- **`/api/cron/alerts`** — the actual digest job. Re-runs each active saved
  search against GDELT, emails anything newer than its last check, updates
  `lastRunAt`. Protected by `CRON_SECRET` (Vercel Cron sends this
  automatically as a Bearer token when the env var is set).
- **`vercel.json`** schedules it once a day (`0 13 * * *` = 1pm UTC) —
  deploying to Vercel with Cron enabled is all that's needed to activate it.
  Self-hosting elsewhere? Hit that same route on a schedule with `node-cron`
  or any external scheduler, sending the same Bearer header.
- **Email**: uses [Resend](https://resend.com) if `RESEND_API_KEY` is set.
  Without it, digests just log to the server console — so you can test the
  whole alert loop locally with zero email-provider signup.

Known limitation worth knowing about: "new since last check" is done by
comparing article timestamps to `lastRunAt`, not by tracking individual
article IDs — fine for a daily digest, but if you shorten the cron interval
below the search's `timespan` window you could get occasional duplicates in
back-to-back digests. Not worth a dedup table for v1; flagging it if you tighten the schedule.

## Phase 5: Payments (done)

Stripe Checkout for a Premium subscription, matching the freemium model from
the original spec.

- **Free tier**: full map/feed/charts access, up to
  `FREE_SAVED_SEARCH_LIMIT` (2, in `src/lib/billing.ts`) saved-search alerts
- **Premium**: unlimited saved searches (the 3-day-lookback perk listed on
  `/account` is aspirational copy — wire it into `FilterRail`'s timespan
  options if you want it enforced)
- **`/account`** — shows current plan, upgrade button, or "Manage billing"
  (Stripe's hosted portal) once subscribed
- **`src/lib/actions/billing.ts`** — Server Actions that create/reuse a
  Stripe Customer, start a Checkout Session, or open the Billing Portal
- **`/api/webhooks/stripe`** — keeps `User.subscriptionStatus` in sync by
  listening for `checkout.session.completed` and
  `customer.subscription.updated|deleted`

Setup (all happen in your Stripe Dashboard, test mode is fine to start):

1. Create a recurring Price for your Premium plan → copy its ID into
   `STRIPE_PRICE_ID`
2. Copy your test secret key into `STRIPE_SECRET_KEY`
3. For local testing, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   and put the printed signing secret into `STRIPE_WEBHOOK_SECRET` — in
   production, create the webhook endpoint in the Dashboard instead and use
   that signing secret
4. Set `APP_URL` to your real deployed URL in production (defaults to
   `localhost:3000` for dev)

Without those env vars set, `/account` still renders and the upgrade button
shows a clear "payments aren't configured yet" message instead of crashing.

## Roadmap (from the original spec)

- [x] **Phase 1 — Database**: Prisma + SQLite (swap to Postgres for prod)
- [x] **Phase 2 — Auth**: NextAuth.js (Auth.js) with email/password + optional Google
- [x] **Phase 3 — Admin dashboard**: role-gated `/admin` route
- [x] **Phase 4 — Alerts**: saved searches + scheduled email digests
- [x] **Phase 5 — Payments**: Stripe Checkout for the freemium tier

All five phases from the original brief are built. See each phase's section
above for setup steps — the app runs fully with just Phase 1 (no external
services needed); Phases 2–5 layer in as you add their env vars.
