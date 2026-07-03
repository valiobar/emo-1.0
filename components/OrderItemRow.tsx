"use client";

import { updateItemQuantity, updateItemStatus } from "@/app/actions/orders";
import { CURRENCY } from "@/lib/constants";
import { OrderItem } from "@/lib/types";
import { useTransition } from "react";
import { StatusBadge } from "./StatusBadge";

interface OrderItemRowProps {
  item: OrderItem;
}

export function OrderItemRow({ item }: OrderItemRowProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between border-b py-2">
      <div>
        <div className="font-medium">
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
              className="h-6 w-6 rounded border"
            >
              +
            </button>
            <button
              type="button"
              disabled={isPending || item.quantity <= 1}
              onClick={() =>
                startTransition(() => updateItemQuantity(item.id, item.quantity - 1))
              }
              className="h-6 w-6 rounded border"
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
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
          >
            Mark delivered
          </button>
        )}
      </div>
    </div>
  );
}
