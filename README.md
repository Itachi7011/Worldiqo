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

## Layout

Four tabs across the top: **Live Map**, **Markets**, **News Channels**, **Sports**.
Every number, pin, headline, and chart across all four comes from live
public sources — no mock data, no seed files.

### Live Map

Three independent sources back the feed, switchable from the sidebar
("Source: Auto / GDELT / RSS / Reddit"):

- **GDELT** (primary, and the only one with map coordinates) — the
  [GDELT Project](https://www.gdeltproject.org/), a free, keyless monitor of
  global news media in 100+ languages, refreshed every 15 minutes.
- **RSS** — 14 sources: major outlets (BBC, Al Jazeera, NPR, Guardian, DW,
  France24, Euronews, CBC), India-priority additions (Times of India, The
  Hindu, Hindustan Times), and two aggregators — Google News (per-country
  editions: India, US, UK) and Bing News — which are genuinely different
  infrastructure from single-outlet feeds and help India-specific searches
  surface more.
- **Reddit** — r/worldnews and r/news via Reddit's keyless read-only JSON
  API. A different kind of source entirely (crowd-submitted links, not a
  wire service).

No map pins from RSS/Reddit (no coordinates in either), but both are fully
independent of GDELT — useful if GDELT is slow, rate-limited, or blocked.

**"Auto" mode (the default)** tries GDELT, RSS, and Reddit **all
concurrently** (not sequentially — that was the cause of ~17s response
times before), and uses RSS/Reddit results whenever GDELT returns fewer
than 8 articles, merging everything de-duplicated by URL. The top bar shows
which source(s) actually contributed, and fetch errors are shown inline in
the feed panel rather than hidden.

The **"Coverage volume over time"** and **"Top source countries"** charts
are computed directly from whatever's in the feed at the time — not a
separate API call — so they can't go empty independently of the feed.

The map colors each pin by a best-guess topic (keyword-matched against the
article snippets GDELT attaches to each location) when viewing "All
signals," with a legend in the bottom-left. Click a pin for a popup listing
up to 5 articles from that location.

If **all** news sources come back empty with errors shown, that's a
network problem, not a code problem — check that your machine can reach
`api.gdeltproject.org` and the RSS/Reddit domains; a firewall, VPN, or
corporate proxy blocking outbound requests is the most common cause.

- **`GET /api/events`** — params: `category`, `q` (free text), `timespan`
  (`1h`/`6h`/`12h`/`24h`/`3d`), `source` (`auto`/`gdelt`/`rss`/`reddit`).

"Category" filters (conflict, disaster, protest, economy, politics,
technology, health) are curated GDELT boolean queries in `src/lib/gdelt.ts`
— GDELT doesn't pre-label categories, so this is keyword/theme matching,
not a fixed taxonomy.

### Markets — currencies, gold, silver, shares, crypto

- **Gold & Silver** — live spot price in ~19 currencies via
  [gold-api.com](https://gold-api.com) (free, keyless), plus a historical
  chart (USD) via Yahoo Finance futures, with Twelve Data as an optional
  second source (see "Resilience" below).
- **Currencies** — top-20 tabs (India and US pinned first) plus a search
  bar covering every currency Frankfurter supports (~30). Live rates +
  historical charts (1W–5Y or full history back to 1999) via
  [Frankfurter](https://frankfurter.dev), ECB-sourced.
- **Shares** — ~58 major companies across **35 countries**
  (`src/lib/markets/stockUniverse.ts`), India and US first per priority,
  shown as browsable tabs plus a search bar for anything else. Live quote +
  historical chart via Yahoo Finance (+ optional Twelve Data). Search is
  entirely client-side — only the selected company triggers a fetch.
- **Crypto** — 14 major coins via [CoinGecko's](https://coingecko.com)
  keyless public API — live price, 24h change, historical chart. (Unchanged
  this round — this one's been reliable.)

Both Shares and Gold/Silver history panels have a manual **Source: Auto /
Yahoo / Twelve Data** picker if the automatic choice isn't working for your
network. See "Resilience" below for why Stooq was removed and what
replaced it.

- **`GET /api/markets/fx`** — `?base=USD`, add `&target=EUR&timeframe=1y&history=1`.
- **`GET /api/markets/metals`** — `?currency=EUR`, add `&symbol=XAU&timeframe=5y&history=1&source=yahoo`.
- **`GET /api/markets/stocks`** — `?yahoo=AAPL`, add `&timeframe=1y&history=1&source=auto`.
- **`GET /api/markets/crypto`** — `?currency=usd`, add `&id=bitcoin&timeframe=1y&history=1`.

### News Channels

Two sub-tabs:

- **Live TV** (default) — embedded YouTube live streams via
  `embed/live_stream?channel=`, which auto-plays whatever's currently live
  on that channel (no stale video IDs to maintain) with YouTube's own
  player controls (volume, mute, fullscreen, all built in). India and the
  US are listed first, with a country filter. **Important caveat**: I could
  only verify 3 channel IDs live this session (NDTV, WION, Al Jazeera
  English) — those get real embeds. Every other channel shows a direct
  "Watch on YouTube" link instead of a guessed (likely broken) embed — see
  `src/lib/liveTv.ts` to add more verified IDs as you confirm them.
- **Articles** — the original feature: browse live headlines by country,
  now ~38 countries (`src/lib/newsChannels.ts`), India and US listed first.
  About half are the same well-tested feeds the Live Map's RSS uses; the
  rest are newer additions I haven't individually verified — if one's wrong
  or down, only that country is affected, shown as a clear message.

- **`GET /api/news-channels`** — `?id=in` for a country's latest headlines.

### Sports

Two sub-tabs:

- **Leagues** — recent results + standings across 12 leagues: **Cricket
  (IPL, India)**, MLB, Premier League, La Liga, Bundesliga, Serie A, Ligue
  1, MLS, Champions League, NBA, NFL, NHL — via
  [TheSportsDB](https://www.thesportsdb.com)'s free public test key, with
  ESPN as a fallback for recent results (not standings). Filter by sport or
  country, or pick **"All (combined results)"** to see recent results
  merged across every currently-filtered league at once. Standings
  availability depends on TheSportsDB having current-season data indexed —
  if a table's empty, that's what happened, shown as a message.
- **Chess** — top-25 leaderboards (Blitz/Rapid/Bullet/Daily) via
  [Chess.com's](https://chess.com) free, keyless public leaderboard API.

Tennis rankings were considered but not added — I couldn't find a source I
was confident enough in to ship without live verification. Worth adding if
you have a preferred one in mind.

- **`GET /api/sports`** — `?league=4460` (IPL) for recent results + standings.
- **`GET /api/sports/chess`** — `?category=live_blitz` for the leaderboard.

All of the above run server-side so the browser never talks to these APIs
directly — avoids CORS and gives one place to add caching/rate-limiting later.

## Resilience: fallback sources + error UX

Several areas have a second (or third) independent data source that kicks
in automatically if the primary one fails or is thin:

| Feature | Sources (in order) |
|---|---|
| Live Map feed | GDELT → RSS (14 outlets, incl. Google News + Bing News editions) → Reddit r/worldnews+r/news |
| Stocks (quote + history) | Yahoo Finance → Twelve Data (optional, needs a free key) |
| Metals history | Yahoo Finance futures → Twelve Data (optional) |
| Currency latest rates | Frankfurter (ECB) → open.er-api.com |
| Sports recent results | TheSportsDB → ESPN |

**Stooq was removed** (previously used for stock/metals history) — it now
returns a CAPTCHA page instead of data for automated/server-side requests,
which is what the "Stooq did not return usable CSV data" / "Stooq returned
404" errors were. Yahoo Finance's chart API replaces it as the primary
source for both. Stocks and metals history panels also have a manual
**Source: Auto / Yahoo / Twelve Data** picker, so if the automatic choice
ever isn't working for your network, you can pick directly rather than
being stuck.

Genuinely free *and* keyless stock/commodity history data is scarce — Yahoo
Finance is the most reliable keyless option that exists. If it's ever
unreliable from your network too, [Twelve Data](https://twelvedata.com) has
a real free tier (800 requests/day, no credit card, ~2 minute signup) that
activates automatically the moment you set `TWELVE_DATA_API_KEY` — nothing
else to configure.

Each panel shows which source actually answered ("via Yahoo Finance", "via
ESPN", etc.) so it's never a mystery. Sports standings and currency
*historical* charts don't currently have a second source.

**Error display**: `src/components/ErrorBanner.tsx` is used everywhere a
source-failure warning appears as a standalone banner (as opposed to inline
"empty state" text that already occupies otherwise-blank space, like an
empty chart — those are left as-is since they don't cost extra room). Each
error gets its own dismiss (✕) button and auto-clears after 20 seconds on
its own, so a stale warning from a temporary hiccup doesn't sit there
indefinitely eating screen space.

## Project structure

```
src/
├─ app/
│  ├─ page.tsx                    # tab shell (Map/Markets/News/Sports), polling, state
│  ├─ layout.tsx                  # fonts, metadata, session provider
│  ├─ globals.css                 # design tokens, map theme, animations
│  ├─ login/, signup/             # auth pages
│  ├─ account/                    # plan status, billing
│  ├─ alerts/                     # saved-search management
│  ├─ admin/                      # role-gated user management
│  └─ api/
│     ├─ events/route.ts          # GDELT + RSS + Reddit, live feed & map pins
│     ├─ timeline/route.ts        # legacy GDELT-only timeline (unused by UI, kept for direct API use)
│     ├─ news-channels/route.ts   # single-country RSS headlines
│     ├─ sports/route.ts          # TheSportsDB + ESPN results/standings
│     ├─ sports/chess/route.ts    # Chess.com leaderboard
│     ├─ markets/{fx,metals,stocks,crypto}/route.ts
│     ├─ auth/, cron/, webhooks/  # Phase 2/4/5 routes
├─ components/
│  ├─ WorldMap.tsx                # react-leaflet, sub-category coloring, legend, multi-article popups
│  ├─ FilterRail.tsx              # category / search / time-window / source controls
│  ├─ EventFeed.tsx               # live scrolling headline list
│  ├─ ChartsPanel.tsx             # volume timeline + top source countries (derived from feed)
│  ├─ TopBar.tsx, Spinner.tsx, ErrorBanner.tsx
│  ├─ markets/                    # MetalsView, CurrencyView (tabs+search), StocksView (tabs+search),
│  │                               # CryptoView, TimeframePicker
│  ├─ news/                       # NewsHubView (tab shell), LiveTvView, NewsChannelsView
│  ├─ sports/                     # SportsHubView (tab shell), SportsView, ChessView
│  ├─ admin/, alerts/, account/   # Phase 3/4/5 UI
├─ lib/
│  ├─ gdelt.ts, rss.ts            # news sources + shared keyword classifier
│  ├─ newsChannels.ts             # per-country outlet list (articles)
│  ├─ liveTv.ts                   # per-country YouTube live-TV channel list
│  ├─ sports/                     # sportsdb.ts (leagues + TheSportsDB/ESPN clients), chess.ts
│  ├─ markets/                    # fx.ts, metals.ts, yahoo.ts, twelvedata.ts, crypto.ts,
│  │                               # stockUniverse.ts, types.ts
│  ├─ actions/                    # Server Actions: admin.ts, alerts.ts, billing.ts
│  ├─ prisma.ts, auth.ts          # Phase 1/2
│  └─ types.ts
```

## Deploying

Works on Vercel with zero config (`vercel deploy`) — it's a standard Next.js app.
The Live Map tab works with no setup at all; Phases 1–5 (accounts, admin,
alerts, billing) need MongoDB + their env vars, per the sections below.

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

## Security notes

`npm audit` will show some vulnerabilities in dev-only tooling (ESLint's
internal dependency chain: `eslint → @eslint/config-array → minimatch →
brace-expansion`). These do not affect the running app — brace-expansion is
a glob-matching library ESLint uses internally to match config file
patterns during `npm run lint`; it never runs in the server, never touches
user input, and never ships to the browser.

**Do not run `npm audit fix --force`** — its suggested resolution is to
downgrade **Next.js itself to version 9.3.3** (from 16), which would break
the entire app. This is a known quirk of npm's automated resolver with
frameworks like Next.js: it just finds *any* version satisfying the
vulnerable-range removal, not a sensible upgrade path.

Two of the flagged issues (`postcss`, `sharp` — both bundled inside Next's
own internals for CSS/image processing) are fixed via targeted `overrides`
in `package.json` that pin patched versions without touching Next's major
version. I attempted the same for `brace-expansion`, but its only patched
release is a major version bump that broke ESLint outright (a real
compatibility conflict, not just an audit warning) — so that one is left
as-is. The actual fix path is upgrading `eslint` to `10.8.0`, but that may
have its own compatibility implications with `eslint-config-next` that are
worth testing deliberately rather than forcing blindly.

## Known limitations, worth knowing about

- **Stock/metals history via Stooq**: `src/lib/markets/stocks.ts` and
  `metals.ts` use Stooq's public CSV export for historical charts — the
  same endpoint tools like `pandas-datareader` use, free and keyless, but
  not an officially documented API. If Stooq ever blocks/rate-limits it,
  history charts show a clear error while live quotes (a different,
  keyless source) keep working.
- **Stock ticker coverage**: `src/lib/markets/stockUniverse.ts` is a
  curated list of ~55 companies across 22 countries, hand-mapped to
  Stooq's `symbol.country-suffix` format. Most are high-confidence (US,
  UK, Germany, Japan, etc.); a handful (India, Indonesia, South Africa)
  are lower-confidence since I couldn't verify Stooq's exact suffix
  convention for those exchanges without live access. If one doesn't
  resolve, only that entry is affected — search and every other ticker
  still work.
