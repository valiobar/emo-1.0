"use client";

import { MenuCategory, MenuItem, RestaurantTable } from "@/lib/types";
import { DishesSection } from "./components/DishesSection";
import { OrdersSection } from "./components/OrdersSection";
import { TablesSection } from "./components/TablesSection";
import { AdminOrderRow } from "./types";

interface AdminDashboardProps {
  readonly categories: MenuCategory[];
  readonly items: MenuItem[];
  readonly tables: RestaurantTable[];
  readonly orders: AdminOrderRow[];
  readonly fromDate: string;
  readonly toDate: string;
  readonly selectedTableId: string;
}

export function AdminDashboard({
  categories,
  items,
  tables,
  orders,
  fromDate,
  toDate,
  selectedTableId,
}: AdminDashboardProps) {
  return (
    <main className="mx-auto w-full max-w-7xl p-4 text-gray-900 sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Админ панел</p>
          <h1 className="text-3xl font-bold tracking-tight">Управление на ресторанта</h1>
          <p className="mt-1 text-sm text-gray-600">
            Управлявайте маси, категории, ястия и преглеждайте поръчки по период.
          </p>
        </div>
        <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
          {tables.length} маси · {categories.length} категории · {items.length} артикула
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <OrdersSection
          orders={orders}
          tables={tables}
          fromDate={fromDate}
          toDate={toDate}
          selectedTableId={selectedTableId}
        />
        <TablesSection tables={tables} />
      </div>

      <div className="mt-4">
        <DishesSection categories={categories} items={items} />
      </div>
    </main>
  );
}
