"use client";

import { TableCard } from "@/components/TableCard";
import { createClient } from "@/lib/supabase/client";
import { RestaurantTable } from "@/lib/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

type ReadyCountRow = {
  orders: {
    table_id: string;
  };
};

interface TableGridProps {
  initialTables: RestaurantTable[];
  initialReadyCounts: Record<string, number>;
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
      for (const item of (data ?? []) as ReadyCountRow[]) {
        const tableId = item.orders.table_id;
        counts[tableId] = (counts[tableId] ?? 0) + 1;
      }
      setReadyCounts(counts);
    }

    const channel = supabase
      .channel("waiter-tables")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload: RealtimePostgresChangesPayload<RestaurantTable>) => {
          setTables((prev) => {
            if (payload.eventType === "INSERT" && payload.new) {
              return [...prev, payload.new];
            }
            if (payload.eventType === "UPDATE" && payload.new) {
              return prev.map((table) =>
                table.id === payload.new.id ? payload.new : table,
              );
            }
            if (payload.eventType === "DELETE" && payload.old) {
              return prev.filter((table) => table.id !== payload.old.id);
            }
            return prev;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        refetchReadyCounts,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          readyCount={readyCounts[table.id] ?? 0}
        />
      ))}
    </div>
  );
}
