"use client";

import { updateItemStatus } from "@/app/actions/orders";
import { STATUS_LABELS } from "@/lib/constants";
import { KitchenItem, OrderItemStatus } from "@/lib/types";
import { useTransition } from "react";

const NEXT_STATUS: Partial<Record<OrderItemStatus, "preparing" | "ready">> = {
  pending: "preparing",
  preparing: "ready",
};

interface KitchenColumnProps {
  readonly title: string;
  readonly items: KitchenItem[];
}

export function KitchenColumn({ title, items }: KitchenColumnProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="min-w-[280px] flex-1 rounded-2xl border border-gray-200 bg-white p-3 text-gray-900 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
            Няма артикули в тази колона.
          </p>
        )}

        {items.map((item) => {
          const next = NEXT_STATUS[item.status];
          return (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                {item.table_name}
              </div>
              <div className="mt-1 font-semibold text-gray-900">
                {item.quantity}x {item.name_snapshot}
              </div>
              {next && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => updateItemStatus(item.id, next))}
                  className="mt-3 min-h-10 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                  Премести към {STATUS_LABELS[next]}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
