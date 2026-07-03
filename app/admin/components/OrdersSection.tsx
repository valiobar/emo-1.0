"use client";

import { CURRENCY } from "@/lib/constants";
import { RestaurantTable } from "@/lib/types";
import { useMemo } from "react";
import { AdminOrderRow } from "../types";

interface OrdersSectionProps {
  readonly orders: AdminOrderRow[];
  readonly tables: RestaurantTable[];
  readonly fromDate: string;
  readonly toDate: string;
  readonly selectedTableId: string;
}

function formatDateTime(dateValue: string | null) {
  if (!dateValue) {
    return "—";
  }
  return new Date(dateValue).toLocaleString("bg-BG");
}

export function OrdersSection({
  orders,
  tables,
  fromDate,
  toDate,
  selectedTableId,
}: OrdersSectionProps) {
  const openOrdersCount = useMemo(
    () => orders.filter((order) => order.status === "open").length,
    [orders],
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Поръчки</h2>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
          {orders.length} поръчки · {openOrdersCount} отворени
        </span>
      </div>

      <form method="get" className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input
          type="date"
          name="fromDate"
          defaultValue={fromDate}
          className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
        />
        <input
          type="date"
          name="toDate"
          defaultValue={toDate}
          className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
        />
        <select
          name="tableId"
          defaultValue={selectedTableId}
          className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
        >
          <option value="">Всички маси</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-10 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          Филтрирай
        </button>
      </form>

      <div className="space-y-2">
        {orders.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
            Няма поръчки за избрания период.
          </p>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{order.tableName}</p>
                  <p className="text-xs text-gray-500">Поръчка #{order.id.slice(0, 8)}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    order.status === "open"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {order.status === "open" ? "Отворена" : "Затворена"}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                <p>Създадена: {formatDateTime(order.createdAt)}</p>
                <p>Затворена: {formatDateTime(order.closedAt)}</p>
                <p>Артикули: {order.itemsCount}</p>
                <p>
                  Сума: {order.totalAmount.toFixed(2)} {CURRENCY}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
