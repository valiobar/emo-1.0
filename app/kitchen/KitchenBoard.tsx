"use client";

import { KitchenColumn } from "@/components/KitchenColumn";
import { createClient } from "@/lib/supabase/client";
import { KitchenItem } from "@/lib/types";
import { useEffect, useState } from "react";

interface KitchenBoardProps {
  readonly initialItems: KitchenItem[];
}

function extractTableNameFromKitchenRow(row: unknown): string {
  if (!row || typeof row !== "object") {
    return "Неизвестна маса";
  }

  const { orders } = row as { orders?: unknown };

  if (!orders || typeof orders !== "object") {
    return "Неизвестна маса";
  }

  const { tables } = orders as { tables?: unknown };

  if (!tables || typeof tables !== "object") {
    return "Неизвестна маса";
  }

  const { name } = tables as { name?: unknown };
  return typeof name === "string" ? name : "Неизвестна маса";
}

export function KitchenBoard({ initialItems }: KitchenBoardProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, orders!inner(status, tables(name))")
        .in("status", ["pending", "preparing", "ready"])
        .eq("orders.status", "open")
        .order("created_at");

      if (error) {
        return;
      }

      setItems(
        (data ?? []).map((row) => ({
          ...(row as Omit<KitchenItem, "table_name">),
          table_name: extractTableNameFromKitchenRow(row),
        })),
      );
    }

    const channel = supabase
      .channel("kitchen-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        refetch,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 overflow-x-auto pb-2 sm:flex-row">
      <KitchenColumn title="Чакащи" items={items.filter((item) => item.status === "pending")} />
      <KitchenColumn
        title="Приготвяне"
        items={items.filter((item) => item.status === "preparing")}
      />
      <KitchenColumn title="Готови" items={items.filter((item) => item.status === "ready")} />
    </div>
  );
}
