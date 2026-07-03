import { createServiceRoleClient } from "@/lib/supabase/server";
import { TableGrid } from "./TableGrid";

type ReadyCountRow = {
  orders: {
    table_id: string;
  };
};

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
  for (const item of (readyItems ?? []) as ReadyCountRow[]) {
    const tableId = item.orders.table_id;
    readyCounts[tableId] = (readyCounts[tableId] ?? 0) + 1;
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Tables</h1>
      <TableGrid initialTables={tables ?? []} initialReadyCounts={readyCounts} />
    </main>
  );
}
