import { createServiceRoleClient } from "@/lib/supabase/server";
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
  const supabase = createServiceRoleClient();

  const { data: tables, error: tablesError } = await supabase
    .from("tables")
    .select("*")
    .order("name");

  if (tablesError) {
    throw new Error(tablesError.message);
  }

  const { data: readyItems, error: readyItemsError } = await supabase
    .from("order_items")
    .select("id, status, orders!inner(table_id, status)")
    .eq("status", "ready")
    .eq("orders.status", "open");

  if (readyItemsError) {
    throw new Error(readyItemsError.message);
  }

  const readyCounts: Record<string, number> = {};
  for (const item of readyItems ?? []) {
    const tableId = extractTableIdFromReadyItem(item);
    if (!tableId) {
      continue;
    }
    readyCounts[tableId] = (readyCounts[tableId] ?? 0) + 1;
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Tables</h1>
      <TableGrid initialTables={tables ?? []} initialReadyCounts={readyCounts} />
    </main>
  );
}
