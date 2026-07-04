"use client";

import { MenuCategory, MenuItem, RestaurantTable } from "@/lib/types";
import { useState } from "react";
import { DishesSection } from "./components/DishesSection";
import { OrdersSection } from "./components/OrdersSection";
import { TablesSection } from "./components/TablesSection";
import { AdminOrderRow } from "./types";

type AdminTab = "orders" | "tables" | "menu";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "orders", label: "Поръчки" },
  { id: "tables", label: "Маси" },
  { id: "menu", label: "Меню" },
];

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
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");

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

      <div
        role="tablist"
        aria-label="Секции на админ панела"
        className="mb-4 flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-10 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200"
                  : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === "orders" && (
          <OrdersSection
            orders={orders}
            tables={tables}
            fromDate={fromDate}
            toDate={toDate}
            selectedTableId={selectedTableId}
          />
        )}

        {activeTab === "tables" && <TablesSection tables={tables} />}

        {activeTab === "menu" && <DishesSection categories={categories} items={items} />}
      </div>
    </main>
  );
}
