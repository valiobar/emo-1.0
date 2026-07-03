"use client";

import { addOrderItemsForTable, closeOrder } from "@/app/actions/orders";
import { BillTotal } from "@/components/BillTotal";
import { MenuPicker } from "@/components/MenuPicker";
import { OrderItemRow } from "@/components/OrderItemRow";
import { CURRENCY } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { MenuCategory, MenuItem, OrderItem, RestaurantTable } from "@/lib/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

interface OrderViewProps {
  readonly table: RestaurantTable;
  readonly orderId: string | null;
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
  const [newItemsByMenuId, setNewItemsByMenuId] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const confirmInFlightRef = useRef(false);

  useEffect(() => {
    setOrderItems(initialOrderItems);
  }, [initialOrderItems, orderId]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

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
  const pendingNewItems = Object.entries(newItemsByMenuId)
    .map(([menuItemId, quantity]) => {
      const menuItem = menuItems.find((item) => item.id === menuItemId);
      if (!menuItem || quantity < 1) {
        return null;
      }

      return {
        menuItemId,
        quantity,
        name: menuItem.name,
        price: menuItem.price,
      };
    })
    .filter((entry): entry is { menuItemId: string; quantity: number; name: string; price: number } =>
      Boolean(entry),
    );

  const hasPendingNewItems = pendingNewItems.length > 0;
  const pendingNewItemsTotal = pendingNewItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const hasAnyItemsInView = orderItems.length > 0 || hasPendingNewItems;

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
        <MenuPicker
          categories={categories}
          items={menuItems}
          disabled={isPending}
          onAddItem={(menuItemId) => {
            setNewItemsByMenuId((prev) => ({
              ...prev,
              [menuItemId]: (prev[menuItemId] ?? 0) + 1,
            }));
          }}
        />
      </section>

      <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Текуща сметка</h2>
        {!hasAnyItemsInView && (
          <p className="text-gray-500">Все още няма поръчани артикули.</p>
        )}
        {pendingNewItems.map((item) => (
          <div
            key={item.menuItemId}
            className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3"
          >
            <div>
              <div className="font-medium text-gray-900">
                {item.quantity}x {item.name}
              </div>
              <div className="text-sm text-sky-800">
                {(item.price * item.quantity).toFixed(2)} {CURRENCY} · Ново (непотвърдено)
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setNewItemsByMenuId((prev) => ({
                    ...prev,
                    [item.menuItemId]: (prev[item.menuItemId] ?? 0) + 1,
                  }))
                }
                className="min-h-10 min-w-10 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 hover:bg-gray-100"
              >
                +
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  setNewItemsByMenuId((prev) => {
                    const nextQuantity = (prev[item.menuItemId] ?? 0) - 1;
                    if (nextQuantity <= 0) {
                      const { [item.menuItemId]: _removed, ...rest } = prev;
                      return rest;
                    }
                    return { ...prev, [item.menuItemId]: nextQuantity };
                  })
                }
                className="min-h-10 min-w-10 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 hover:bg-gray-100"
              >
                -
              </button>
            </div>
          </div>
        ))}
        {hasPendingNewItems && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
            <p className="text-sm font-medium text-indigo-900">
              Непотвърдени артикули: {pendingNewItemsTotal.toFixed(2)} {CURRENCY}
            </p>
            <button
              type="button"
              disabled={isPending || confirmInFlightRef.current}
              onClick={() => {
                startTransition(async () => {
                  if (confirmInFlightRef.current) {
                    return;
                  }
                  confirmInFlightRef.current = true;
                  try {
                    await addOrderItemsForTable(
                      table.id,
                      pendingNewItems.map((item) => ({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                      })),
                    );
                    setNewItemsByMenuId({});
                    router.refresh();
                  } catch (error) {
                    console.error("Failed to confirm new items:", error);
                    alert("Неуспешно потвърждаване на новите артикули. Моля, опитайте отново.");
                  } finally {
                    confirmInFlightRef.current = false;
                  }
                });
              }}
              className="min-h-10 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              Потвърди новите артикули
            </button>
          </div>
        )}
        {orderItems.map((item) => (
          <OrderItemRow key={item.id} item={item} />
        ))}
        <BillTotal items={orderItems} />
      </section>

      <button
        type="button"
        disabled={isPending || !orderId}
        onClick={() => {
          if (!orderId) {
            return;
          }

          if (
            hasUnservedItems &&
            !confirm("Някои артикули все още не са маркирани като сервирани. Да приключа ли сметката въпреки това?")
          ) {
            return;
          }

          startTransition(async () => {
            try {
              await closeOrder(orderId, table.id);
              router.replace("/waiter");
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
