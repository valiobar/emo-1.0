import { createServiceRoleClient } from "@/lib/supabase/server";
import { RestaurantTable } from "@/lib/types";
import { TableGrid } from "./TableGrid";

export const dynamic = "force-dynamic";

function extractTableIdFromReadyItem(item: unknown): string | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as { orders?: unknown };
  const { orders } = row;

  if (Array.isArray(orders)) {
    const firstOrder = orders[0];
    if (
      firstOrder &&
      typeof firstOrder === "object" &&
      "table_id" in firstOrder &&
      typeof firstOrder.table_id === "string"
    ) {
      return firstOrder.table_id;
    }
    return null;
  }

  if (
    orders &&
    typeof orders === "object" &&
    "table_id" in orders &&
    typeof orders.table_id === "string"
  ) {
    return orders.table_id;
  }

  return null;
}

export default async function WaiterPage() {
  let tables: RestaurantTable[] = [];
  let readyItems: unknown[] = [];
  let dataError = "";

  try {
    const supabase = createServiceRoleClient();

    const { data: tablesData, error: tablesError } = await supabase
      .from("tables")
      .select("*")
      .order("name");

    if (tablesError) {
      throw new Error(tablesError.message);
    }

    const { data: readyItemsData, error: readyItemsError } = await supabase
      .from("order_items")
      .select("id, status, orders!inner(table_id, status)")
      .eq("status", "ready")
      .eq("orders.status", "open");

    if (readyItemsError) {
      throw new Error(readyItemsError.message);
    }

    tables = tablesData ?? [];
    readyItems = readyItemsData ?? [];
  } catch (error) {
    console.error("Failed to load waiter page data:", error);
    dataError = "Неуспешно зареждане на данните за сервитьора.";
  }

  const readyCounts: Record<string, number> = {};
  for (const item of readyItems) {
    const tableId = extractTableIdFromReadyItem(item);
    if (!tableId) {
      continue;
    }
    readyCounts[tableId] = (readyCounts[tableId] ?? 0) + 1;
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 text-gray-900 sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Конзола сервитьор</p>
          <h1 className="text-3xl font-bold tracking-tight">Маси</h1>
          <p className="mt-1 text-sm text-gray-600">
            Отворени поръчки по маси и индикатори за готови артикули в реално време.
          </p>
        </div>
        <div className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
          {tables.length} маси
        </div>
      </header>
      {dataError ? (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {dataError}
        </p>
      ) : null}
      <TableGrid initialTables={tables} initialReadyCounts={readyCounts} />
    </main>
  );
}
