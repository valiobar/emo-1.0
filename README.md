# emo-1.0 — Waiter/Kitchen Realtime Orders

Internal real-time ordering app for a small restaurant team:
- waiters place orders by table
- kitchen sees incoming items live and updates statuses
- waiters see running bills and delivery progress

No login (internal-use workflow).

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS)
- Supabase (Postgres + Realtime)
- Vercel deployment

Architecture notes live in `docs/architecture.md`.

## Routes

- `/` — landing page with links
- `/waiter` — table grid
- `/waiter/[tableId]` — table order view and running bill
- `/kitchen` — kitchen board (`pending` / `preparing` / `ready`)
- `/admin/menu` — menu categories/items management
- `/admin/tables` — tables management

## Environment Variables

Create `.env.local` using `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- one of:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (recommended)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (supported fallback)

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a free Supabase project at [supabase.com](https://supabase.com/).
3. Run `supabase/schema.sql` in the Supabase SQL Editor.
4. Fill `.env.local` with your Supabase values from **Project Settings → API**.
5. Start dev server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000).

## Deploy (Free Tier)

1. Push to `main` in `valiobar/emo-1.0`.
2. Import the repo into Vercel ([vercel.com](https://vercel.com/) → New Project).
3. Add the same env vars in **Project Settings → Environment Variables**.
4. Deploy (Vercel auto-builds on push to `main`).
