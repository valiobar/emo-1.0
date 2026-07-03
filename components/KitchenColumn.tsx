"use client";

import { updateItemStatus } from "@/app/actions/orders";
import { KitchenItem, OrderItemStatus } from "@/lib/types";
import { useTransition } from "react";

const NEXT_STATUS: Partial<Record<OrderItemStatus, "preparing" | "ready">> = {
  pending: "preparing",
  preparing: "ready",
};

interface KitchenColumnProps {
  title: string;
  items: KitchenItem[];
}

export function KitchenColumn({ title, items }: KitchenColumnProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex-1 rounded-lg bg-gray-50 p-3">
      <h2 className="mb-2 font-semibold">
        {title} ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((item) => {
          const next = NEXT_STATUS[item.status];
          return (
            <div key={item.id} className="rounded-md border bg-white p-3 shadow-sm">
              <div className="text-xs text-gray-500">{item.table_name}</div>
              <div className="font-medium">
                {item.quantity}x {item.name_snapshot}
              </div>
              {next && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => updateItemStatus(item.id, next))}
                  className="mt-2 rounded bg-black px-2 py-1 text-xs text-white"
                >
                  Move to {next}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
