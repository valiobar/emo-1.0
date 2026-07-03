"use client";

import { updateItemQuantity, updateItemStatus } from "@/app/actions/orders";
import { CURRENCY } from "@/lib/constants";
import { OrderItem } from "@/lib/types";
import { useTransition } from "react";
import { StatusBadge } from "./StatusBadge";

interface OrderItemRowProps {
  readonly item: OrderItem;
}

export function OrderItemRow({ item }: OrderItemRowProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-200 py-3">
      <div>
        <div className="font-medium text-gray-900">
          {item.quantity}x {item.name_snapshot}
        </div>
        <div className="text-sm text-gray-500">
          {(item.price_snapshot * item.quantity).toFixed(2)} {CURRENCY}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={item.status} />

        {item.status === "pending" && (
          <div className="flex gap-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(() => updateItemQuantity(item.id, item.quantity + 1))
              }
              className="min-h-10 min-w-10 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 hover:bg-gray-100"
            >
              +
            </button>
            <button
              type="button"
              disabled={isPending || item.quantity <= 1}
              onClick={() =>
                startTransition(() => updateItemQuantity(item.id, item.quantity - 1))
              }
              className="min-h-10 min-w-10 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 hover:bg-gray-100"
            >
              -
            </button>
          </div>
        )}

        {item.status === "ready" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => updateItemStatus(item.id, "served"))}
            className="min-h-10 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-500"
          >
            Маркирай като сервирано
          </button>
        )}
      </div>
    </div>
  );
}
