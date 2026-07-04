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
  notes text,
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
