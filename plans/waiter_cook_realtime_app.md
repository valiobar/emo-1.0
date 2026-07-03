# Waiter-Cook Realtime Ordering App — Implementation Plan

## Overview

Build a small internal web app used by a single restaurant/bar team: waiters take orders per table on a menu split into categories (drinks, meals, ...), the kitchen sees incoming orders live and updates their status, and the waiter sees a running bill per table with a visual indicator of what's been processed and what hasn't. No login — just three unguarded routes (`/waiter`, `/kitchen`, `/admin`). Stack: **Next.js (App Router, TypeScript, Tailwind)** deployed free on **Vercel**, backed by **Supabase** (Postgres + Realtime) free tier for persistence and live sync. This plan supersedes/implements the high-level plan at `waiter-cook_realtime_app_e29b6090.plan.md` and resolves the conflict with `.cursor/rules/general.mdc` by deliberately **not** using its FSD/NextAuth template (project is too small to warrant it — decision confirmed with the user).

## Pros / Cons

**Pros:**
- Runs entirely free at this scale (Vercel free tier + Supabase free tier).
- True real-time sync via Supabase Realtime (Postgres logical replication) — no polling needed.
- Single Next.js codebase; no separate backend service to build or deploy.
- Relational schema matches the domain naturally (tables → orders → order items → menu items) and keeps historical bills accurate via price/name snapshots.
- No login friction for a small, trusted internal team.

**Cons:**
- No auth means anyone with the deployed URL can view/modify data — acceptable only because it's internal and not publicly advertised.
- Supabase free tier has limits (project can pause after ~7 days of no traffic, capped concurrent realtime connections/DB size) — fine for this use case but a future growth risk.
- Writes (Server Actions) and the realtime read-refresh are decoupled — the client that made a change relies on receiving its own realtime event back, so the merge logic in each client component must be correct or the UI feels laggy.
- No automated test suite is included in this plan (manual testing checklist only), given the scope and personal-project nature.

## Current State Analysis

- ✅ Git repo initialized and pushed to GitHub (`valiobar/emo-1.0`, `main` branch)
- ✅ `.cursor/rules/` present (`general.mdc`, `performance.mdc`, `planning.mdc`)
- ✅ `docs/` folder added with initial architecture documentation (Step 1)
- ✅ Next.js app scaffolded at repo root via `create-next-app` (Step 2)
- ✅ Supabase schema + RLS SQL created in `supabase/schema.sql` (Step 3)
- ❌ No pages, components, server actions, or types

## Implementation Steps

### ✅ Step 1: Create minimal architecture documentation

**File(s)**: `docs/architecture.md`

**Changes**:
- Create `docs/` folder with an architecture doc covering stack, data flow, schema summary, read/write pattern, env vars, and deployment steps, satisfying `planning.mdc`'s "read/write docs first" requirement for future work on this repo.

**Pseudo-code**:

```markdown
# Architecture Overview

## Purpose
Internal real-time ordering app for a single small restaurant/bar. Connects waiters
and kitchen staff. No public users, no login (see Known Limitations).

## Stack
- Next.js 15 (App Router, TypeScript, Tailwind CSS)
- Supabase (Postgres + Realtime), free tier
- Deployment: Vercel (free tier) for the app, Supabase (free tier) for the database

## Data flow

​```mermaid
flowchart LR
    Waiter["/waiter pages (browser)"] -->|"realtime subscribe"| SupaRT[Supabase Realtime]
    Kitchen["/kitchen page (browser)"] -->|"realtime subscribe"| SupaRT
    Waiter -->|"server action calls"| NextServer[Next.js Server Actions]
    Kitchen -->|"server action calls"| NextServer
    Admin["/admin pages"] -->|"server action calls"| NextServer
    NextServer -->|"service-role key"| SupaDB[(Supabase Postgres)]
    SupaDB --> SupaRT
​```

## Data model
- tables(id, name, status: free|occupied)
- menu_categories(id, name, sort_order)
- menu_items(id, category_id, name, price, is_available)
- orders(id, table_id, status: open|closed, created_at, closed_at)
- order_items(id, order_id, menu_item_id, name_snapshot, price_snapshot, quantity,
  status: pending|preparing|ready|served, created_at, updated_at)

## Read/write pattern
- Reads: Server Components fetch initial data via `lib/supabase/server.ts` (service-role
  key, trusted server context) at request time. Client Components then subscribe to
  Supabase Realtime via `lib/supabase/client.ts` (anon key) and merge live changes into
  local state.
- Writes: All mutations go through Next.js Server Actions in `app/actions/*.ts`, using
  the service-role key. The anon key is read-only in practice: RLS is enabled on every
  table with only `SELECT` policies for the public/anon role.

## Order item status lifecycle
pending -> preparing -> ready -> served
(quantity is only editable by the waiter while status = pending)

## Environment variables
| Variable | Used by | Description |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | client + server | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | browser client | Public anon key, read-only via RLS |
| SUPABASE_SERVICE_ROLE_KEY | server actions only | Secret key, full DB access, server-only |

## Routes
| Route | Purpose |
|---|---|
| `/` | Landing, links to Waiter / Kitchen / Admin |
| `/waiter` | Table grid |
| `/waiter/[tableId]` | Menu picker + order + bill for one table |
| `/kitchen` | Kanban board of open order items |
| `/admin/menu` | CRUD categories/items |
| `/admin/tables` | CRUD tables |

## Deployment
1. Create a free Supabase project, run `supabase/schema.sql` in its SQL editor.
2. Create a free Vercel account, import the `valiobar/emo-1.0` GitHub repo.
3. Set env vars above in `.env.local` (dev) and in the Vercel project settings (prod).
4. Push to `main` — Vercel auto-deploys.

## Known limitations
- No authentication — anyone with the deployed URL can use/modify data. Mitigated only
  by not publishing the URL. Revisit if this ever needs to be multi-tenant or public.
- Supabase free-tier project pauses after ~7 days without traffic — needs a manual
  restart from the dashboard if unused for a week (or set up a periodic ping).
```

---

### ✅ Step 2: Scaffold the Next.js project

**File(s)**: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/layout.tsx`, `app/globals.css`, `.gitignore`, `.env.local.example`

**Changes**:
- Scaffold via the official CLI (keeps config current instead of hand-authoring possibly-stale config files), then add the two Supabase packages.
- Root-level `app/`, `lib/`, `components/` — no `src/` dir, no FSD (per resolved conflict with `general.mdc`).

**Pseudo-code**:

```bash
# from emo-1.0/
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias "@/*"

npm install @supabase/supabase-js @supabase/ssr
```

```text
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```tsx
// app/layout.tsx
import './globals.css';

export const metadata = { title: 'emo — Orders', description: 'Internal waiter/kitchen app' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
```

**Code Location**: New files at repo root, generated by the CLI plus the two edits above.

---

### ✅ Step 3: Define the Supabase schema and RLS policies

**File(s)**: `supabase/schema.sql`

**Changes**:
- Create all five tables, indexes, a partial unique index to prevent duplicate open orders per table, enable Realtime, enable RLS with public-read-only policies.

**Pseudo-code**:

```sql
create extension if not exists "pgcrypto";

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'free' check (status in ('free', 'occupied')),
  created_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Prevents a race condition where two waiters open two orders for the same table at once
create unique index uq_open_order_per_table on public.orders(table_id) where status = 'open';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  price_snapshot numeric(10,2) not null,
  quantity int not null default 1 check (quantity > 0),
  status text not null default 'pending' check (status in ('pending','preparing','ready','served')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_order_items_order_id on public.order_items(order_id);
create index idx_orders_table_id on public.orders(table_id);
create index idx_menu_items_category_id on public.menu_items(category_id);

-- Realtime
alter publication supabase_realtime add table public.tables, public.orders, public.order_items;

-- RLS: public read-only. All writes happen via Server Actions using the service-role key,
-- which bypasses RLS entirely, so no insert/update/delete policies are defined for anon.
alter table public.tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public read tables" on public.tables for select using (true);
create policy "public read menu_categories" on public.menu_categories for select using (true);
create policy "public read menu_items" on public.menu_items for select using (true);
create policy "public read orders" on public.orders for select using (true);
create policy "public read order_items" on public.order_items for select using (true);
```

---

### Step 4: Supabase clients and shared types

**File(s)**: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/types.ts`, `lib/constants.ts`

**Changes**:
- Browser client (anon key) for Realtime + reads in Client Components.
- Server-only client (service-role key) for Server Actions and SSR data fetching.
- TypeScript types mirroring the schema; status color/label/currency constants.

**Pseudo-code**:

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```ts
// lib/supabase/server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-only: never import this file from a "use client" component.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
```

```ts
// lib/types.ts
export type TableStatus = 'free' | 'occupied';
export type OrderStatus = 'open' | 'closed';
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served';

export interface RestaurantTable {
  id: string;
  name: string;
  status: TableStatus;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface Order {
  id: string;
  table_id: string;
  status: OrderStatus;
  created_at: string;
  closed_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  status: OrderItemStatus;
  created_at: string;
  updated_at: string;
}

export interface KitchenItem extends OrderItem {
  table_name: string;
}
```

```ts
// lib/constants.ts
import { OrderItemStatus } from './types';

export const CURRENCY = 'BGN';

export const STATUS_COLORS: Record<OrderItemStatus, string> = {
  pending: 'bg-gray-200 text-gray-800 border-gray-400',
  preparing: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  ready: 'bg-green-100 text-green-800 border-green-500',
  served: 'bg-blue-100 text-blue-800 border-blue-400',
};

export const STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
};
```

---

### Step 5: Server Actions — tables

**File(s)**: `app/actions/tables.ts`

**Changes**:
- CRUD for the `tables` entity, used by `/admin/tables`. Blocks deleting a table that has an open order.

**Pseudo-code**:

```ts
// app/actions/tables.ts
'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTable(name: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('tables').insert({ name, status: 'free' });
  if (error) throw new Error(error.message);
  revalidatePath('/waiter');
  revalidatePath('/admin/tables');
}

export async function renameTable(id: string, name: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('tables').update({ name }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/waiter');
  revalidatePath('/admin/tables');
}

export async function deleteTable(id: string) {
  const supabase = createServiceRoleClient();
  const { data: openOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', id)
    .eq('status', 'open')
    .maybeSingle();
  if (openOrder) throw new Error('Cannot delete a table with an open order');

  const { error } = await supabase.from('tables').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/waiter');
  revalidatePath('/admin/tables');
}
```

---

### Step 6: Server Actions — menu

**File(s)**: `app/actions/menu.ts`

**Changes**:
- CRUD for `menu_categories` and `menu_items`, used by `/admin/menu` and read by the waiter's `MenuPicker`.

**Pseudo-code**:

```ts
// app/actions/menu.ts
'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCategory(name: string, sortOrder = 0) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('menu_categories').insert({ name, sort_order: sortOrder });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/menu');
  revalidatePath('/waiter');
}

export async function deleteCategory(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('menu_categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/menu');
  revalidatePath('/waiter');
}

export async function createMenuItem(input: { categoryId: string; name: string; price: number }) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('menu_items').insert({
    category_id: input.categoryId,
    name: input.name,
    price: input.price,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/menu');
  revalidatePath('/waiter');
}

export async function updateMenuItem(
  id: string,
  input: Partial<{ name: string; price: number; isAvailable: boolean }>,
) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('menu_items')
    .update({ name: input.name, price: input.price, is_available: input.isAvailable })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/menu');
  revalidatePath('/waiter');
}

export async function deleteMenuItem(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/menu');
  revalidatePath('/waiter');
}
```

---

### Step 7: Server Actions — orders and order items (core logic)

**File(s)**: `app/actions/orders.ts`

**Changes**:
- `openOrderForTable`: idempotent, relies on the partial unique index from Step 3 to survive races (catches the unique-violation and re-selects).
- `addOrderItem`: snapshots name/price from the current menu item at insert time.
- `updateItemQuantity`: only allowed while `status = 'pending'`.
- `updateItemStatus`: cook advances pending→preparing→ready; waiter advances ready→served.
- `closeOrder`: closes the order and frees the table.

**Pseudo-code**:

```ts
// app/actions/orders.ts
'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function openOrderForTable(tableId: string): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'open')
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('orders')
    .insert({ table_id: tableId, status: 'open' })
    .select('id')
    .single();

  if (error) {
    // Unique violation = another request already opened it concurrently; just use it.
    if (error.code === '23505') {
      const { data: race } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .eq('status', 'open')
        .single();
      if (race) return race.id;
    }
    throw new Error(error.message);
  }

  await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId);
  revalidatePath('/waiter');
  return data.id;
}

export async function addOrderItem(orderId: string, menuItemId: string, quantity = 1) {
  const supabase = createServiceRoleClient();

  const { data: menuItem, error: menuError } = await supabase
    .from('menu_items')
    .select('name, price')
    .eq('id', menuItemId)
    .single();
  if (menuError) throw new Error(menuError.message);

  const { error } = await supabase.from('order_items').insert({
    order_id: orderId,
    menu_item_id: menuItemId,
    name_snapshot: menuItem.name,
    price_snapshot: menuItem.price,
    quantity,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  if (quantity < 1) throw new Error('Quantity must be at least 1');
  const supabase = createServiceRoleClient();

  const { data: item, error: fetchError } = await supabase
    .from('order_items')
    .select('status')
    .eq('id', itemId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (item.status !== 'pending') {
    throw new Error('Cannot change quantity once the kitchen has started this item');
  }

  const { error } = await supabase
    .from('order_items')
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function updateItemStatus(
  itemId: string,
  status: 'preparing' | 'ready' | 'served',
) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('order_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function closeOrder(orderId: string, tableId: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);

  await supabase.from('tables').update({ status: 'free' }).eq('id', tableId);
  revalidatePath('/waiter');
}
```

---

### Step 8: Shared UI components

**File(s)**: `components/StatusBadge.tsx`, `components/TableCard.tsx`, `components/MenuPicker.tsx`, `components/OrderItemRow.tsx`, `components/KitchenColumn.tsx`, `components/BillTotal.tsx`

**Changes**:
- Presentational + lightly interactive pieces reused across the waiter/kitchen pages.

**Pseudo-code**:

```tsx
// components/StatusBadge.tsx
import { OrderItemStatus } from '@/lib/types';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';

export function StatusBadge({ status }: { status: OrderItemStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
```

```tsx
// components/TableCard.tsx
import Link from 'next/link';
import { RestaurantTable } from '@/lib/types';

export function TableCard({ table, readyCount }: { table: RestaurantTable; readyCount: number }) {
  const styles = table.status === 'free' ? 'bg-white border-gray-300' : 'bg-orange-50 border-orange-400';
  return (
    <Link href={`/waiter/${table.id}`} className={`relative block rounded-lg border p-4 shadow-sm transition hover:shadow-md ${styles}`}>
      <div className="text-lg font-semibold">{table.name}</div>
      <div className="text-sm capitalize text-gray-500">{table.status}</div>
      {readyCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
          {readyCount}
        </span>
      )}
    </Link>
  );
}
```

```tsx
// components/MenuPicker.tsx
'use client';
import { useState, useTransition } from 'react';
import { MenuCategory, MenuItem } from '@/lib/types';
import { CURRENCY } from '@/lib/constants';
import { addOrderItem } from '@/app/actions/orders';

export function MenuPicker({ orderId, categories, items }: {
  orderId: string; categories: MenuCategory[]; items: MenuItem[];
}) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [isPending, startTransition] = useTransition();
  const visibleItems = items.filter((i) => i.category_id === activeCategory && i.is_available);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b pb-2">
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${activeCategory === c.id ? 'bg-black text-white' : 'bg-gray-100'}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleItems.map((item) => (
          <button key={item.id} disabled={isPending}
            onClick={() => startTransition(() => addOrderItem(orderId, item.id, 1))}
            className="rounded-lg border p-3 text-left hover:bg-gray-50 disabled:opacity-50">
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-gray-500">{item.price.toFixed(2)} {CURRENCY}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// components/OrderItemRow.tsx
'use client';
import { useTransition } from 'react';
import { OrderItem } from '@/lib/types';
import { CURRENCY } from '@/lib/constants';
import { StatusBadge } from './StatusBadge';
import { updateItemQuantity, updateItemStatus } from '@/app/actions/orders';

export function OrderItemRow({ item }: { item: OrderItem }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between border-b py-2">
      <div>
        <div className="font-medium">{item.quantity}x {item.name_snapshot}</div>
        <div className="text-sm text-gray-500">{(item.price_snapshot * item.quantity).toFixed(2)} {CURRENCY}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={item.status} />
        {item.status === 'pending' && (
          <div className="flex gap-1">
            <button disabled={isPending} onClick={() => startTransition(() => updateItemQuantity(item.id, item.quantity + 1))} className="h-6 w-6 rounded border">+</button>
            <button disabled={isPending || item.quantity <= 1} onClick={() => startTransition(() => updateItemQuantity(item.id, item.quantity - 1))} className="h-6 w-6 rounded border">-</button>
          </div>
        )}
        {item.status === 'ready' && (
          <button disabled={isPending} onClick={() => startTransition(() => updateItemStatus(item.id, 'served'))} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
            Mark delivered
          </button>
        )}
      </div>
    </div>
  );
}
```

```tsx
// components/KitchenColumn.tsx
'use client';
import { useTransition } from 'react';
import { KitchenItem } from '@/lib/types';
import { updateItemStatus } from '@/app/actions/orders';

const NEXT_STATUS: Record<string, 'preparing' | 'ready' | undefined> = {
  pending: 'preparing',
  preparing: 'ready',
};

export function KitchenColumn({ title, items }: { title: string; items: KitchenItem[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex-1 rounded-lg bg-gray-50 p-3">
      <h2 className="mb-2 font-semibold">{title} ({items.length})</h2>
      <div className="space-y-2">
        {items.map((item) => {
          const next = NEXT_STATUS[item.status];
          return (
            <div key={item.id} className="rounded-md border bg-white p-3 shadow-sm">
              <div className="text-xs text-gray-500">{item.table_name}</div>
              <div className="font-medium">{item.quantity}x {item.name_snapshot}</div>
              {next && (
                <button disabled={isPending} onClick={() => startTransition(() => updateItemStatus(item.id, next))} className="mt-2 rounded bg-black px-2 py-1 text-xs text-white">
                  Move to {next}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

```tsx
// components/BillTotal.tsx
import { OrderItem } from '@/lib/types';
import { CURRENCY } from '@/lib/constants';

export function BillTotal({ items }: { items: OrderItem[] }) {
  const total = items.reduce((sum, i) => sum + i.price_snapshot * i.quantity, 0);
  return (
    <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
      <span>Total</span>
      <span>{total.toFixed(2)} {CURRENCY}</span>
    </div>
  );
}
```

---

### Step 9: Landing page

**File(s)**: `app/page.tsx`

**Changes**:
- Simple nav hub to the three sections.

**Pseudo-code**:

```tsx
// app/page.tsx
import Link from 'next/link';

const LINKS = [
  { href: '/waiter', label: 'Waiter' },
  { href: '/kitchen', label: 'Kitchen' },
  { href: '/admin/menu', label: 'Admin — Menu' },
  { href: '/admin/tables', label: 'Admin — Tables' },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Restaurant Orders</h1>
      <div className="flex flex-col gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg border px-6 py-3 text-center hover:bg-gray-100">
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
```

---

### Step 10: Waiter pages — table grid and table detail (realtime)

**File(s)**: `app/waiter/page.tsx`, `app/waiter/TableGrid.tsx`, `app/waiter/[tableId]/page.tsx`, `app/waiter/[tableId]/OrderView.tsx`

**Changes**:
- `page.tsx` files are Server Components: fetch initial data with the service-role client.
- Client Components subscribe to Realtime and merge incoming Postgres change payloads into local state. This is the canonical realtime pattern reused (with variations) on the kitchen page too.

**Pseudo-code**:

```tsx
// app/waiter/page.tsx
import { createServiceRoleClient } from '@/lib/supabase/server';
import { TableGrid } from './TableGrid';

export default async function WaiterPage() {
  const supabase = createServiceRoleClient();
  const { data: tables } = await supabase.from('tables').select('*').order('name');
  const { data: readyItems } = await supabase
    .from('order_items')
    .select('id, status, orders!inner(table_id, status)')
    .eq('status', 'ready')
    .eq('orders.status', 'open');

  const readyCounts: Record<string, number> = {};
  for (const item of readyItems ?? []) {
    const tableId = (item as any).orders.table_id;
    readyCounts[tableId] = (readyCounts[tableId] ?? 0) + 1;
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Tables</h1>
      <TableGrid initialTables={tables ?? []} initialReadyCounts={readyCounts} />
    </main>
  );
}
```

```tsx
// app/waiter/TableGrid.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RestaurantTable } from '@/lib/types';
import { TableCard } from '@/components/TableCard';

export function TableGrid({ initialTables, initialReadyCounts }: {
  initialTables: RestaurantTable[]; initialReadyCounts: Record<string, number>;
}) {
  const [tables, setTables] = useState(initialTables);
  const [readyCounts, setReadyCounts] = useState(initialReadyCounts);

  useEffect(() => {
    const supabase = createClient();

    async function refetchReadyCounts() {
      const { data } = await supabase
        .from('order_items')
        .select('id, status, orders!inner(table_id, status)')
        .eq('status', 'ready')
        .eq('orders.status', 'open');
      const counts: Record<string, number> = {};
      for (const item of data ?? []) {
        const tableId = (item as any).orders.table_id;
        counts[tableId] = (counts[tableId] ?? 0) + 1;
      }
      setReadyCounts(counts);
    }

    const channel = supabase
      .channel('waiter-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload) => {
        setTables((prev) => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new as RestaurantTable];
          if (payload.eventType === 'UPDATE') return prev.map((t) => (t.id === (payload.new as RestaurantTable).id ? (payload.new as RestaurantTable) : t));
          if (payload.eventType === 'DELETE') return prev.filter((t) => t.id !== (payload.old as RestaurantTable).id);
          return prev;
        });
      })
      // Simplest-correct approach: any order_item change just re-fetches ready counts
      // (volume is tiny for a single restaurant, so this is cheap and always consistent).
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refetchReadyCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {tables.map((t) => (
        <TableCard key={t.id} table={t} readyCount={readyCounts[t.id] ?? 0} />
      ))}
    </div>
  );
}
```

```tsx
// app/waiter/[tableId]/page.tsx
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { openOrderForTable } from '@/app/actions/orders';
import { OrderView } from './OrderView';

export default async function TableOrderPage({ params }: { params: { tableId: string } }) {
  const supabase = createServiceRoleClient();
  const { data: table } = await supabase.from('tables').select('*').eq('id', params.tableId).single();
  if (!table) notFound();

  const orderId = await openOrderForTable(table.id);

  const [{ data: categories }, { data: items }, { data: orderItems }] = await Promise.all([
    supabase.from('menu_categories').select('*').order('sort_order'),
    supabase.from('menu_items').select('*').eq('is_available', true),
    supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at'),
  ]);

  return (
    <OrderView
      table={table}
      orderId={orderId}
      categories={categories ?? []}
      menuItems={items ?? []}
      initialOrderItems={orderItems ?? []}
    />
  );
}
```

```tsx
// app/waiter/[tableId]/OrderView.tsx
'use client';
import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MenuCategory, MenuItem, OrderItem, RestaurantTable } from '@/lib/types';
import { MenuPicker } from '@/components/MenuPicker';
import { OrderItemRow } from '@/components/OrderItemRow';
import { BillTotal } from '@/components/BillTotal';
import { closeOrder } from '@/app/actions/orders';

export function OrderView({ table, orderId, categories, menuItems, initialOrderItems }: {
  table: RestaurantTable; orderId: string; categories: MenuCategory[];
  menuItems: MenuItem[]; initialOrderItems: OrderItem[];
}) {
  const [orderItems, setOrderItems] = useState(initialOrderItems);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, (payload) => {
        setOrderItems((prev) => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new as OrderItem];
          if (payload.eventType === 'UPDATE') return prev.map((i) => (i.id === (payload.new as OrderItem).id ? (payload.new as OrderItem) : i));
          if (payload.eventType === 'DELETE') return prev.filter((i) => i.id !== (payload.old as OrderItem).id);
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const hasUnservedItems = orderItems.some((i) => i.status !== 'served');

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{table.name}</h1>
      <MenuPicker orderId={orderId} categories={categories} items={menuItems} />
      <div className="mt-6">
        {orderItems.length === 0 && <p className="text-gray-500">No items ordered yet.</p>}
        {orderItems.map((item) => <OrderItemRow key={item.id} item={item} />)}
        <BillTotal items={orderItems} />
      </div>
      <button
        disabled={isPending}
        onClick={() => {
          if (hasUnservedItems && !confirm('Some items are not marked as served yet. Close the bill anyway?')) return;
          startTransition(() => closeOrder(orderId, table.id));
        }}
        className="mt-4 w-full rounded-lg bg-red-600 py-2 font-medium text-white disabled:opacity-50"
      >
        Close & pay
      </button>
    </main>
  );
}
```

---

### Step 11: Kitchen page (Kanban board, realtime)

**File(s)**: `app/kitchen/page.tsx`, `app/kitchen/KitchenBoard.tsx`

**Changes**:
- Fetch all non-served order items for open orders joined with table name; group into Pending/Preparing/Ready columns; subscribe to realtime and re-fetch (same "simplest-correct" strategy as Step 10) on any relevant change.

**Pseudo-code**:

```tsx
// app/kitchen/page.tsx
import { createServiceRoleClient } from '@/lib/supabase/server';
import { KitchenBoard } from './KitchenBoard';
import { KitchenItem } from '@/lib/types';

async function fetchKitchenItems(supabase: ReturnType<typeof createServiceRoleClient>): Promise<KitchenItem[]> {
  const { data } = await supabase
    .from('order_items')
    .select('*, orders!inner(status, tables(name))')
    .in('status', ['pending', 'preparing', 'ready'])
    .eq('orders.status', 'open')
    .order('created_at');

  return (data ?? []).map((row: any) => ({
    ...row,
    table_name: row.orders.tables.name,
  }));
}

export default async function KitchenPage() {
  const supabase = createServiceRoleClient();
  const items = await fetchKitchenItems(supabase);
  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Kitchen</h1>
      <KitchenBoard initialItems={items} />
    </main>
  );
}
```

```tsx
// app/kitchen/KitchenBoard.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KitchenItem } from '@/lib/types';
import { KitchenColumn } from '@/components/KitchenColumn';

export function KitchenBoard({ initialItems }: { initialItems: KitchenItem[] }) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const { data } = await supabase
        .from('order_items')
        .select('*, orders!inner(status, tables(name))')
        .in('status', ['pending', 'preparing', 'ready'])
        .eq('orders.status', 'open')
        .order('created_at');
      setItems((data ?? []).map((row: any) => ({ ...row, table_name: row.orders.tables.name })));
    }

    const channel = supabase
      .channel('kitchen-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <KitchenColumn title="Pending" items={items.filter((i) => i.status === 'pending')} />
      <KitchenColumn title="Preparing" items={items.filter((i) => i.status === 'preparing')} />
      <KitchenColumn title="Ready" items={items.filter((i) => i.status === 'ready')} />
    </div>
  );
}
```

---

### Step 12: Admin pages — menu and tables management

**File(s)**: `app/admin/menu/page.tsx`, `app/admin/menu/MenuManager.tsx`, `app/admin/tables/page.tsx`, `app/admin/tables/TablesManager.tsx`

**Changes**:
- Plain CRUD forms calling the Step 5/6 server actions; single-admin usage so no realtime needed here — `revalidatePath` inside the actions is enough to refresh server-rendered data after a client `router.refresh()`/form submit.

**Pseudo-code**:

```tsx
// app/admin/menu/page.tsx
import { createServiceRoleClient } from '@/lib/supabase/server';
import { MenuManager } from './MenuManager';

export default async function AdminMenuPage() {
  const supabase = createServiceRoleClient();
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('menu_categories').select('*').order('sort_order'),
    supabase.from('menu_items').select('*').order('name'),
  ]);
  return <MenuManager categories={categories ?? []} items={items ?? []} />;
}
```

```tsx
// app/admin/menu/MenuManager.tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MenuCategory, MenuItem } from '@/lib/types';
import { CURRENCY } from '@/lib/constants';
import { createCategory, createMenuItem, deleteCategory, deleteMenuItem } from '@/app/actions/menu';

export function MenuManager({ categories, items }: { categories: MenuCategory[]; items: MenuItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState({ categoryId: categories[0]?.id ?? '', name: '', price: '' });

  function refresh() { startTransition(() => router.refresh()); }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Menu</h1>

      <section className="mb-6">
        <h2 className="font-semibold">Categories</h2>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b py-1">
            <span>{c.name}</span>
            <button onClick={async () => { await deleteCategory(c.id); refresh(); }} className="text-sm text-red-600">Delete</button>
          </div>
        ))}
        <div className="mt-2 flex gap-2">
          <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category" className="flex-1 rounded border px-2 py-1" />
          <button disabled={isPending} onClick={async () => { await createCategory(newCategoryName); setNewCategoryName(''); refresh(); }} className="rounded bg-black px-3 py-1 text-white">Add</button>
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Items</h2>
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between border-b py-1">
            <span>{i.name} — {i.price.toFixed(2)} {CURRENCY}</span>
            <button onClick={async () => { await deleteMenuItem(i.id); refresh(); }} className="text-sm text-red-600">Delete</button>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={newItem.categoryId} onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })} className="rounded border px-2 py-1">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Name" className="rounded border px-2 py-1" />
          <input value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="Price" type="number" step="0.01" className="w-24 rounded border px-2 py-1" />
          <button disabled={isPending} onClick={async () => {
            await createMenuItem({ categoryId: newItem.categoryId, name: newItem.name, price: parseFloat(newItem.price) });
            setNewItem({ ...newItem, name: '', price: '' });
            refresh();
          }} className="rounded bg-black px-3 py-1 text-white">Add</button>
        </div>
      </section>
    </main>
  );
}
```

```tsx
// app/admin/tables/page.tsx
import { createServiceRoleClient } from '@/lib/supabase/server';
import { TablesManager } from './TablesManager';

export default async function AdminTablesPage() {
  const supabase = createServiceRoleClient();
  const { data: tables } = await supabase.from('tables').select('*').order('name');
  return <TablesManager tables={tables ?? []} />;
}
```

```tsx
// app/admin/tables/TablesManager.tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantTable } from '@/lib/types';
import { createTable, deleteTable } from '@/app/actions/tables';

export function TablesManager({ tables }: { tables: RestaurantTable[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');

  function refresh() { startTransition(() => router.refresh()); }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">Tables</h1>
      {tables.map((t) => (
        <div key={t.id} className="flex items-center justify-between border-b py-1">
          <span>{t.name} ({t.status})</span>
          <button onClick={async () => {
            try { await deleteTable(t.id); refresh(); }
            catch (e) { alert((e as Error).message); }
          }} className="text-sm text-red-600">Delete</button>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Table name (e.g. Table 5)" className="flex-1 rounded border px-2 py-1" />
        <button disabled={isPending} onClick={async () => { await createTable(name); setName(''); refresh(); }} className="rounded bg-black px-3 py-1 text-white">Add</button>
      </div>
    </main>
  );
}
```

---

### Step 13: Styling and responsive pass

**File(s)**: all page/component files from Steps 8–12, `app/globals.css`

**Changes**:
- Verify mobile-first layout since waiters/cooks will likely use phones or a tablet (grid columns collapse on small screens, tap targets ≥ 40px, kitchen columns stack vertically on narrow viewports — already expressed via `sm:flex-row` in Step 11).
- Confirm color contrast for the four status colors is distinguishable at a glance under kitchen lighting.
- No new files — this is a review/tweak pass over what Steps 8–12 already produced.

**Pseudo-code**:

```tsx
// Example tweak: KitchenColumn.tsx wrapper becomes horizontally scrollable on very small screens
// instead of squishing 3 columns:
<div className="flex flex-col gap-4 overflow-x-auto sm:flex-row">
  {/* ... */}
</div>
```

---

### Step 14: Environment configuration and deployment instructions

**File(s)**: `.env.local.example` (already created in Step 2), `README.md`

**Changes**:
- Update the repo `README.md` (currently just `# emo-1.0`) with setup, local dev, and deployment instructions.

**Pseudo-code**:

```markdown
# emo-1.0 — Waiter/Kitchen Realtime Orders

Internal real-time ordering app: waiters place orders per table, the kitchen sees them
live and updates status, waiters see a running bill. No login (internal use only).

## Stack
Next.js (App Router) + Supabase (Postgres + Realtime). See `docs/architecture.md`.

## Local setup
1. `npm install`
2. Create a free project at supabase.com
3. Run `supabase/schema.sql` in the Supabase SQL editor
4. Copy `.env.local.example` to `.env.local` and fill in the 3 Supabase values
   (Project Settings -> API in the Supabase dashboard)
5. `npm run dev` -> http://localhost:3000

## Deploy (free)
1. Push to `main` on `valiobar/emo-1.0` (already set up as the git remote)
2. Import the repo into Vercel (vercel.com -> New Project)
3. Add the same 3 env vars in Vercel Project Settings -> Environment Variables
4. Deploy — Vercel auto-builds on every push to `main`

## Routes
/waiter, /waiter/[tableId], /kitchen, /admin/menu, /admin/tables
```

---

### Step 15: Update Documentation (mandatory)

**File(s)**: `docs/architecture.md`, `README.md`

**Changes**:
- After all previous steps are implemented, re-read `docs/architecture.md` written in Step 1 and reconcile it with what was actually built (route list, env var names, any deviations such as different table/column names or an added feature).
- If nothing drifted from the Step 1 draft, this step is still required to run but ends with an explicit note: "Reviewed `docs/architecture.md` and `README.md` — no changes needed, implementation matches the documented design."

**Pseudo-code**:

```text
1. Diff the actual `app/` route tree and `supabase/schema.sql` against
   docs/architecture.md's "Routes" and "Data model" sections.
2. Update any mismatches (e.g. if a column was renamed during implementation).
3. Add a short "How realtime sync works" paragraph to docs/architecture.md
   if the final subscription pattern differs from the Step 10/11 pseudo-code.
4. Confirm README's env var names exactly match lib/supabase/client.ts and
   lib/supabase/server.ts.
```

## Edge Cases

- **Concurrent order creation for the same table**: handled by the partial unique index `uq_open_order_per_table` (Step 3) plus the catch-and-reselect logic in `openOrderForTable` (Step 7).
- **Deleting a menu item referenced by past orders**: `order_items.menu_item_id` uses `on delete set null`, and `name_snapshot`/`price_snapshot` preserve historical bill accuracy regardless.
- **Deleting a table with an open order**: blocked explicitly in `deleteTable` (Step 5) with a thrown error surfaced via `alert()` in the admin UI.
- **Closing a table while items are still pending/preparing/ready**: `OrderView` (Step 10) shows a `confirm()` warning before allowing close, but does not hard-block it (waiter judgment call, e.g. a walkout).
- **Quantity edits after the kitchen has started an item**: blocked server-side in `updateItemQuantity` (Step 7), not just hidden in the UI, so it can't be bypassed by calling the action directly.
- **Stale client state after a dropped WebSocket connection**: Supabase's client auto-reconnects channels; as a safety net, consider re-fetching on `window.onfocus` in a future iteration (not required for v1 given small scale, noted here rather than built).
- **Empty categories or menu**: `MenuPicker` (Step 8) simply renders an empty items grid; admin pages should be used to seed at least one category/item before real use.
- **Currency/price formatting**: centralized in `lib/constants.ts` (`CURRENCY`) rather than hardcoded per component, so it's a one-line change if needed.

## Testing Checklist

- [ ] Waiter table grid shows correct free/occupied color and ready-item badge counts
- [ ] Opening a table with no existing order creates exactly one `orders` row (verify in Supabase table editor)
- [ ] Opening the same table twice (e.g. two browser tabs) does not create a duplicate open order
- [ ] Adding a menu item appears on the Kitchen board within ~1 second without a manual refresh
- [ ] Cook advancing pending -> preparing -> ready reflects instantly on the Waiter's table detail page
- [ ] Waiter marking a ready item "served" removes it from the Kitchen board and updates its badge on the bill
- [ ] Bill total always equals sum(quantity * price_snapshot) for all items in the open order
- [ ] Closing an order sets the table back to "free" and removes it from the occupied state on `/waiter`
- [ ] Editing a menu item's price does not retroactively change already-placed order items (snapshot behavior)
- [ ] Admin can create/delete categories and items; new items appear in the Waiter's menu picker
- [ ] Admin cannot delete a table that has an open order (error surfaced, not a silent failure)
- [ ] Two browser tabs (simulating a waiter's phone + a kitchen tablet) stay in sync live
- [ ] Layout is usable on a phone-width viewport (375px) for both `/waiter/[tableId]` and `/kitchen`
- [ ] Confirm anon key cannot write directly (attempt an insert from the browser console against the Supabase client and confirm RLS rejects it)
- [ ] Production build (`npm run build`) succeeds locally before pushing
- [ ] Deployed Vercel app connects to Supabase successfully with production env vars

## Files to Modify

- ✅ `docs/architecture.md` (new)
- ✅ `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts` (new, via CLI)
- ✅ `app/layout.tsx`, `app/globals.css` (new/edited)
- ✅ `.env.local.example` (new)
- ✅ `supabase/schema.sql` (new)
- [ ] `lib/supabase/client.ts` (new)
- [ ] `lib/supabase/server.ts` (new)
- [ ] `lib/types.ts` (new)
- [ ] `lib/constants.ts` (new)
- [ ] `app/actions/tables.ts` (new)
- [ ] `app/actions/menu.ts` (new)
- [ ] `app/actions/orders.ts` (new)
- [ ] `components/StatusBadge.tsx` (new)
- [ ] `components/TableCard.tsx` (new)
- [ ] `components/MenuPicker.tsx` (new)
- [ ] `components/OrderItemRow.tsx` (new)
- [ ] `components/KitchenColumn.tsx` (new)
- [ ] `components/BillTotal.tsx` (new)
- [ ] `app/page.tsx` (new)
- [ ] `app/waiter/page.tsx`, `app/waiter/TableGrid.tsx` (new)
- [ ] `app/waiter/[tableId]/page.tsx`, `app/waiter/[tableId]/OrderView.tsx` (new)
- [ ] `app/kitchen/page.tsx`, `app/kitchen/KitchenBoard.tsx` (new)
- [ ] `app/admin/menu/page.tsx`, `app/admin/menu/MenuManager.tsx` (new)
- [ ] `app/admin/tables/page.tsx`, `app/admin/tables/TablesManager.tsx` (new)
- [ ] `README.md` (edited)

## Implementation Order

1. Step 1 — `docs/architecture.md`
2. Step 2 — Scaffold Next.js project
3. Step 3 — Supabase schema + RLS
4. Step 4 — Supabase clients + types/constants
5. Step 5 — Server Actions: tables
6. Step 6 — Server Actions: menu
7. Step 7 — Server Actions: orders/order items
8. Step 8 — Shared UI components
9. Step 9 — Landing page
10. Step 10 — Waiter pages (grid + table detail, realtime)
11. Step 11 — Kitchen page (realtime)
12. Step 12 — Admin pages (menu + tables)
13. Step 13 — Styling/responsive pass
14. Step 14 — Env/README/deployment instructions
15. Step 15 — Documentation update (mandatory closing step)

## Documentation Update

Covered as **Step 15** above — mandatory final step that reconciles `docs/architecture.md` and `README.md` with what was actually built, even if the note ends up being "no changes needed."
