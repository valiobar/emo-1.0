"use client";

import { closeOrder } from "@/app/actions/orders";
import { BillTotal } from "@/components/BillTotal";
import { MenuPicker } from "@/components/MenuPicker";
import { OrderItemRow } from "@/components/OrderItemRow";
import { createClient } from "@/lib/supabase/client";
import { MenuCategory, MenuItem, OrderItem, RestaurantTable } from "@/lib/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface OrderViewProps {
  readonly table: RestaurantTable;
  readonly orderId: string;
  readonly categories: MenuCategory[];
  readonly menuItems: MenuItem[];
  readonly initialOrderItems: OrderItem[];
}

function applyOrderItemPayload(
  prev: OrderItem[],
  payload: RealtimePostgresChangesPayload<OrderItem>,
) {
  if (payload.eventType === "INSERT" && payload.new) {
    return [...prev, payload.new];
  }
  if (payload.eventType === "UPDATE" && payload.new) {
    return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
  }
  if (payload.eventType === "DELETE" && payload.old) {
    return prev.filter((item) => item.id !== payload.old.id);
  }
  return prev;
}

export function OrderView({
  table,
  orderId,
  categories,
  menuItems,
  initialOrderItems,
}: OrderViewProps) {
  const router = useRouter();
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
        (payload: RealtimePostgresChangesPayload<OrderItem>) =>
          setOrderItems((prev) => applyOrderItemPayload(prev, payload)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const hasUnservedItems = orderItems.some((item) => item.status !== "served");

  return (
    <main className="mx-auto max-w-4xl p-4 text-gray-900 sm:p-6">
      <Link
        href="/waiter"
        aria-label="Назад към всички маси"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-xl leading-none text-gray-800 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <span aria-hidden="true">←</span>
      </Link>

      <header className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Конзола сервитьор</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{table.name}</h1>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Добави артикули</h2>
        <MenuPicker orderId={orderId} categories={categories} items={menuItems} />
      </section>

      <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Текуща сметка</h2>
        {orderItems.length === 0 && (
          <p className="text-gray-500">Все още няма поръчани артикули.</p>
        )}
        {orderItems.map((item) => (
          <OrderItemRow key={item.id} item={item} />
        ))}
        <BillTotal items={orderItems} />
      </section>

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            hasUnservedItems &&
            !confirm("Някои артикули все още не са маркирани като сервирани. Да приключа ли сметката въпреки това?")
          ) {
            return;
          }

          startTransition(async () => {
            try {
              await closeOrder(orderId, table.id);
              router.push("/waiter");
              router.refresh();
            } catch (error) {
              console.error("Failed to close order:", error);
              alert("Неуспешно приключване на сметката. Моля, опитайте отново.");
            }
          });
        }}
        className="mt-4 min-h-11 w-full rounded-xl bg-red-600 py-2 font-medium text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
      >
        Приключи и плати
      </button>
    </main>
  );
}
