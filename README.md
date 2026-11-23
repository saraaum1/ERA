# ERA — Culture · Activities · Experiences

ERA is a web platform for booking cultural experiences — with a focus on Saudi Arabia — where every experience has its own **digital passport stamp**.

Customers browse and book experiences, receive a digital ticket, and collect a unique stamp once their host confirms they took part. Service providers create experiences, design each experience's stamp identity, upload a cover photo, manage bookings and award stamps.

## Features

- **Customers:** browse & filter experiences (Saudi Arabia first), book a seat, digital ticket (Heritage Pass), My Bookings, a digital passport with collected stamps and ranks, profile & password settings.
- **Service providers:** dashboard with statistics, add / edit / delete experiences, cover photo upload, stamp designer (shape, ink colour, emblem) with live preview, bookings list, confirm completion to award stamps.
- **Rules enforced by the server and MySQL triggers:** one seat per booking, automatic ticket, stamp only after the experience date, no booking of past or full experiences, no deleting experiences with active bookings.

## Tech stack

TanStack Start (React 19 + TypeScript), Tailwind CSS 4, Node.js API route (`/api/era`), MySQL / MariaDB with `mysql2`, bcrypt passwords and signed HttpOnly session cookies.

## ERA Guide (AI assistant)

The **Ask ERA** button on every page opens a guide: visitors write their city and interests (Arabic or English) and get the best matching experiences.

- It only recommends real, available experiences (upcoming, with seats left). The server checks every recommended ID against the database, and the cards show data straight from the database, so dates, places and availability are never invented. Distances come from a fixed table of city coordinates.
- **Free by default:** without an API key it uses a built-in matcher (city, interests, categories; whole-word Arabic/English matching).
- **With Claude:** set  (local , Vercel or Railway variables) and the guide uses Claude (, low effort, structured output) for natural conversation. If Claude is unavailable it falls back to the built-in matcher.
- Limited to 20 questions per visitor per 10 minutes.

## Run locally

Requirements: **Node.js 20.6+** and **MySQL 8 / MariaDB 10.10+**.

1. Install packages:
   ```sh
   npm install
   ```
2. Create the database by running `ERA_database.sql` in MySQL (tables + triggers).
3. Copy `.env.example` to `.env` and fill in your MySQL details and a random `ERA_SESSION_SECRET` (32+ characters).
4. Add the demo data (optional):
   ```sh
   npm run seed:demo     # demo accounts + 6 experiences
   npm run seed:saudi    # Saudi experiences with photos
   npm run fix:dates     # past history so the demo passport has stamps
   ```
5. Start the site:
   ```sh
   npm run dev
   ```

Demo accounts (local testing only): `customer@era.demo` / `demo1234` and `provider@era.demo` / `demo1234`.

## Deploy free on Vercel + Neon

ERA runs on **MySQL locally** and on **PostgreSQL (Neon) in the cloud** — the server picks the engine from the connection string. `ERA_database.postgres.sql` is the PostgreSQL version of the schema, with the same tables, rules and triggers.

1. On [vercel.com](https://vercel.com) sign in with GitHub → **Add New → Project** → import this repository → **Deploy** (the first deploy has no database yet; that's fine).
2. In the project: **Storage → Create Database → Neon (Serverless Postgres)** → create it and **connect** it to the project. Vercel adds `DATABASE_URL` automatically.
3. **Settings → Environment Variables**, add:
   | Variable | Value |
   |---|---|
   | `ERA_SESSION_SECRET` | any random text, 32+ characters |
   | `ERA_DEMO_PASSWORD` | your own strong password for the demo accounts |
4. **Deployments → ⋯ → Redeploy.** The build (`vercel-build`) creates the tables and triggers on Neon, adds the demo content (set `ERA_SEED_DEMO=false` to start empty), and builds the site.

Your site is live at `https://<project>.vercel.app`, and every push to `main` redeploys it.

## Deploy on Railway

This app needs a **Node.js server and a MySQL database**, so it cannot run on static hosting such as GitHub Pages. The repo is ready for [Railway](https://railway.com): `railway.json` builds a Node server, prepares the database on every deploy (`npm run db:setup`) and starts the site (`npm start`).

1. In Railway: **New Project → Deploy from GitHub repo →** choose this repository.
2. In the same project: **+ Create → Database → MySQL**.
3. Open the ERA service → **Variables** and add:
   | Variable | Value |
   |---|---|
   | `MYSQL_URL` | `${{MySQL.MYSQL_URL}}` (reference to the MySQL service) |
   | `ERA_SESSION_SECRET` | any random text, 32+ characters |
   | `ERA_DEMO_PASSWORD` | your own strong password for the demo accounts |
4. ERA service → **Settings → Networking → Generate Domain** to get the public link.
5. Railway redeploys automatically. The first deploy creates all tables and triggers and adds the demo content (set `ERA_SEED_DEMO=false` to start empty).

Every push to `main` redeploys the site. Provider cover photos are stored in the database, so they survive redeploys.

Never commit `.env`.

## Project structure

| Path | What it is |
|---|---|
| `src/routes/` | Pages (home, explore, booking, ticket, passport, provider pages…) |
| `src/components/era/` | ERA components (stamps, cards, layout, upload, motion) |
| `src/lib/era/api.server.ts` | Server API: auth, bookings, activities, uploads (server only) |
| `src/lib/era/store.ts` | Client data layer that talks to `/api/era` |
| `src/lib/era/stamps.ts` | Stamp identities (shapes, inks, emblems) |
| `ERA_database.sql` | MySQL schema and triggers |
| `ERA_stamp_identity.sql` | Migration that adds stamp identity columns to an older database |
| `scripts/` | Demo data and date-fix scripts |

Photo credits for the Saudi experience posters are listed on the site's **Photo credits** page (`/credits`).
