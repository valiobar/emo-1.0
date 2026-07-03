"use client";

import { TableCard } from "@/components/TableCard";
import { createClient } from "@/lib/supabase/client";
import { RestaurantTable } from "@/lib/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

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

interface TableGridProps {
  readonly initialTables: RestaurantTable[];
  readonly initialReadyCounts: Record<string, number>;
}

function applyTablePayload(
  prev: RestaurantTable[],
  payload: RealtimePostgresChangesPayload<RestaurantTable>,
) {
  if (payload.eventType === "INSERT" && payload.new) {
    return [...prev, payload.new];
  }
  if (payload.eventType === "UPDATE" && payload.new) {
    return prev.map((table) => (table.id === payload.new.id ? payload.new : table));
  }
  if (payload.eventType === "DELETE" && payload.old) {
    return prev.filter((table) => table.id !== payload.old.id);
  }
  return prev;
}

export function TableGrid({ initialTables, initialReadyCounts }: TableGridProps) {
  const [tables, setTables] = useState(initialTables);
  const [readyCounts, setReadyCounts] = useState(initialReadyCounts);

  useEffect(() => {
    const supabase = createClient();

    async function refetchReadyCounts() {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, status, orders!inner(table_id, status)")
        .eq("status", "ready")
        .eq("orders.status", "open");

      if (error) {
        return;
      }

      const counts: Record<string, number> = {};
      for (const item of data ?? []) {
        const tableId = extractTableIdFromReadyItem(item);
        if (!tableId) {
          continue;
        }
        counts[tableId] = (counts[tableId] ?? 0) + 1;
      }
      setReadyCounts(counts);
    }

    const channel = supabase
      .channel("waiter-tables")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload: RealtimePostgresChangesPayload<RestaurantTable>) =>
          setTables((prev) => applyTablePayload(prev, payload)),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        refetchReadyCounts,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      {tables.length === 0 && (
        <p className="rounded-2xl border border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600 shadow-sm">
          Все още няма маси. Добавете маси от админ секцията.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            readyCount={readyCounts[table.id] ?? 0}
          />
        ))}
      </div>
    </>
  );
}
