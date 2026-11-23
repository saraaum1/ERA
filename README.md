# ERA — Culture · Activities · Experiences

ERA is a web platform for booking cultural experiences — with a focus on Saudi Arabia — where every experience has its own **digital passport stamp**.

Customers browse and book experiences, receive a digital ticket, and collect a unique stamp once their host confirms they took part. Service providers create experiences, design each experience's stamp identity, upload a cover photo, manage bookings and award stamps.

## Features

- **Customers:** browse & filter experiences (Saudi Arabia first), book a seat, digital ticket (Heritage Pass), My Bookings, a digital passport with collected stamps and ranks, profile & password settings.
- **Service providers:** dashboard with statistics, add / edit / delete experiences, cover photo upload, stamp designer (shape, ink colour, emblem) with live preview, bookings list, confirm completion to award stamps.
- **Rules enforced by the server and MySQL triggers:** one seat per booking, automatic ticket, stamp only after the experience date, no booking of past or full experiences, no deleting experiences with active bookings.

## Tech stack

TanStack Start (React 19 + TypeScript), Tailwind CSS 4, Node.js API route (`/api/era`), MySQL / MariaDB with `mysql2`, bcrypt passwords and signed HttpOnly session cookies.

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

## Deployment

This app needs a **Node.js server and a MySQL database**, so it cannot run on static hosting such as GitHub Pages. Deploy it to a host that supports Node.js + MySQL (for example Railway or Render with a managed MySQL), set the variables from `.env.example` there, and run `ERA_database.sql` on the hosted database.

Never commit `.env`. Remove or change the demo accounts before a public launch.

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
