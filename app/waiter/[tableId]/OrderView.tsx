"use client";

import { closeOrder } from "@/app/actions/orders";
import { BillTotal } from "@/components/BillTotal";
import { MenuPicker } from "@/components/MenuPicker";
import { OrderItemRow } from "@/components/OrderItemRow";
import { createClient } from "@/lib/supabase/client";
import { MenuCategory, MenuItem, OrderItem, RestaurantTable } from "@/lib/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState, useTransition } from "react";

interface OrderViewProps {
  table: RestaurantTable;
  orderId: string;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  initialOrderItems: OrderItem[];
}

export function OrderView({
  table,
  orderId,
  categories,
  menuItems,
  initialOrderItems,
}: OrderViewProps) {
  const [orderItems, setOrderItems] = useState(initialOrderItems);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${orderId}`,
        },
        (payload: RealtimePostgresChangesPayload<OrderItem>) => {
          setOrderItems((prev) => {
            if (payload.eventType === "INSERT" && payload.new) {
              return [...prev, payload.new];
            }
            if (payload.eventType === "UPDATE" && payload.new) {
              return prev.map((item) =>
                item.id === payload.new.id ? payload.new : item,
              );
            }
            if (payload.eventType === "DELETE" && payload.old) {
              return prev.filter((item) => item.id !== payload.old.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  const hasUnservedItems = orderItems.some((item) => item.status !== "served");

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{table.name}</h1>
      <MenuPicker orderId={orderId} categories={categories} items={menuItems} />

      <div className="mt-6">
        {orderItems.length === 0 && (
          <p className="text-gray-500">No items ordered yet.</p>
        )}
        {orderItems.map((item) => (
          <OrderItemRow key={item.id} item={item} />
        ))}
        <BillTotal items={orderItems} />
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            hasUnservedItems &&
            !confirm("Some items are not marked as served yet. Close the bill anyway?")
          ) {
            return;
          }

          startTransition(() => closeOrder(orderId, table.id));
        }}
        className="mt-4 w-full rounded-lg bg-red-600 py-2 font-medium text-white disabled:opacity-50"
      >
        Close & pay
      </button>
    </main>
  );
}
