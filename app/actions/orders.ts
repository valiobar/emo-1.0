"use server";

import { revalidatePath } from "next/cache";
import { APP_TIME_ZONE } from "@/lib/constants";
import { createServiceRoleClient } from "@/lib/supabase/server";

type UpdatableItemStatus = "preparing" | "ready" | "served";

const ALLOWED_STATUS_TRANSITIONS: Record<string, UpdatableItemStatus | undefined> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

function getDateParts(dateInput: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) {
    throw new TypeError("Невалиден период");
  }

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const valueByType = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  ) as Record<string, number>;

  const asUtcMillis = Date.UTC(
    valueByType.year,
    valueByType.month - 1,
    valueByType.day,
    valueByType.hour,
    valueByType.minute,
    valueByType.second,
  );

  return asUtcMillis - date.getTime();
}

function toUtcStartOfDateInTimeZone(dateInput: string, timeZone: string) {
  const { year, month, day } = getDateParts(dateInput);
  const localMidnightAsUtcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);

  let utcMillis = localMidnightAsUtcGuess;
  for (let i = 0; i < 2; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(new Date(utcMillis), timeZone);
    utcMillis = localMidnightAsUtcGuess - offsetMs;
  }

  return utcMillis;
}

function addOneDay(dateInput: string) {
  const { year, month, day } = getDateParts(dateInput);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + 1);

  const nextYear = utcDate.getUTCFullYear();
  const nextMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(utcDate.getUTCDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export async function openOrderForTable(tableId: string): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("id")
    .eq("table_id", tableId)
    .eq("status", "open")
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({ table_id: tableId, status: "open" })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: raceOrder, error: raceError } = await supabase
        .from("orders")
        .select("id")
        .eq("table_id", tableId)
        .eq("status", "open")
        .single();

      if (raceError) {
        throw new Error(raceError.message);
      }

      await supabase.from("tables").update({ status: "occupied" }).eq("id", tableId);
      return raceOrder.id;
    }

    throw new Error(error.message);
  }

  await supabase.from("tables").update({ status: "occupied" }).eq("id", tableId);
  return data.id;
}

export async function addOrderItemForTable(tableId: string, menuItemId: string, quantity = 1) {
  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("id")
    .eq("table_id", tableId)
    .eq("status", "open")
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let orderId = existing?.id;

  if (!orderId) {
    const { data, error } = await supabase
      .from("orders")
      .insert({ table_id: tableId, status: "open" })
      .select("id")
      .single();

    if (error) {
      if (error.code !== "23505") {
        throw new Error(error.message);
      }

      const { data: raceOrder, error: raceError } = await supabase
        .from("orders")
        .select("id")
        .eq("table_id", tableId)
        .eq("status", "open")
        .single();

      if (raceError) {
        throw new Error(raceError.message);
      }

      orderId = raceOrder.id;
    } else {
      orderId = data.id;
    }
  }

  const { error: tableError } = await supabase
    .from("tables")
    .update({ status: "occupied" })
    .eq("id", tableId);

  if (tableError) {
    throw new Error(tableError.message);
  }

  if (!orderId) {
    throw new Error("Неуспешно създаване на отворена поръчка");
  }

  await addOrderItem(orderId, menuItemId, quantity);

  revalidatePath("/waiter");
  revalidatePath(`/waiter/${tableId}`);

  return orderId;
}

export async function addOrderItemsForTable(
  tableId: string,
  items: { menuItemId: string; quantity: number }[],
) {
  const normalizedItems = items.filter(
    (item) => item.menuItemId.trim().length > 0 && item.quantity > 0,
  );
  if (normalizedItems.length === 0) {
    throw new Error("Няма валидни артикули за добавяне");
  }

  const orderId = await openOrderForTable(tableId);
  const supabase = createServiceRoleClient();

  const menuItemIds = Array.from(new Set(normalizedItems.map((item) => item.menuItemId)));
  const { data: menuItems, error: menuItemsError } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .in("id", menuItemIds);

  if (menuItemsError) {
    throw new Error(menuItemsError.message);
  }

  const menuById = new Map((menuItems ?? []).map((item) => [item.id, item]));
  const rowsToInsert = normalizedItems.map((item) => {
    const menu = menuById.get(item.menuItemId);
    if (!menu) {
      throw new Error("Артикулът от менюто не е намерен");
    }

    return {
      order_id: orderId,
      menu_item_id: item.menuItemId,
      name_snapshot: menu.name,
      price_snapshot: menu.price,
      quantity: item.quantity,
      status: "pending" as const,
    };
  });

  const { error: insertError } = await supabase.from("order_items").insert(rowsToInsert);
  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/waiter");
  revalidatePath(`/waiter/${tableId}`);

  return orderId;
}

export async function addOrderItem(orderId: string, menuItemId: string, quantity = 1) {
  const supabase = createServiceRoleClient();

  const { data: menuItem, error: menuItemError } = await supabase
    .from("menu_items")
    .select("name, price")
    .eq("id", menuItemId)
    .single();

  if (menuItemError) {
    throw new Error(menuItemError.message);
  }

  const { error } = await supabase.from("order_items").insert({
    order_id: orderId,
    menu_item_id: menuItemId,
    name_snapshot: menuItem.name,
    price_snapshot: menuItem.price,
    quantity,
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  if (quantity < 1) {
    throw new Error("Количеството трябва да е поне 1");
  }

  const supabase = createServiceRoleClient();
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("status")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  if (item.status !== "pending") {
    throw new Error("Количеството не може да се променя, след като кухнята е започнала този артикул");
  }

  const { error } = await supabase
    .from("order_items")
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateItemStatus(itemId: string, status: UpdatableItemStatus) {
  const supabase = createServiceRoleClient();
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("status")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  const nextStatus = ALLOWED_STATUS_TRANSITIONS[item.status];

  if (!nextStatus || nextStatus !== status) {
    throw new Error(`Невалиден преход на статус от "${item.status}" към "${status}"`);
  }

  const { error } = await supabase
    .from("order_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeOrderItem(itemId: string) {
  const supabase = createServiceRoleClient();
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("order_id, status")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw new Error(itemError.message);
  }

  if (item.status !== "pending") {
    throw new Error("Артикулът не може да се изтрие, след като кухнята е започнала работа по него");
  }

  const { error: deleteError } = await supabase.from("order_items").delete().eq("id", itemId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { count: remainingItemsCount, error: remainingItemsError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", item.order_id);

  if (remainingItemsError) {
    throw new Error(remainingItemsError.message);
  }

  if ((remainingItemsCount ?? 0) === 0) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, table_id, status")
      .eq("id", item.order_id)
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message);
    }

    if (order?.status === "open") {
      const { error: closeOrderError } = await supabase
        .from("orders")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("status", "open");

      if (closeOrderError) {
        throw new Error(closeOrderError.message);
      }

      const { error: freeTableError } = await supabase
        .from("tables")
        .update({ status: "free" })
        .eq("id", order.table_id);

      if (freeTableError) {
        throw new Error(freeTableError.message);
      }

      revalidatePath(`/waiter/${order.table_id}`);
    }
  }

  revalidatePath("/waiter");
}

export async function closeOrder(orderId: string, tableId: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message);
  }

  const { error: tableError } = await supabase
    .from("tables")
    .update({ status: "free" })
    .eq("id", tableId);

  if (tableError) {
    throw new Error(tableError.message);
  }

  revalidatePath("/waiter");
}

export async function calculateEarningsByDateRange(fromDate: string, toDate: string) {
  if (!fromDate || !toDate) {
    throw new Error("Началната и крайната дата са задължителни");
  }

  const fromDateTime = new Date(`${fromDate}T00:00:00`);
  const toDateTime = new Date(`${toDate}T00:00:00`);

  if (Number.isNaN(fromDateTime.getTime()) || Number.isNaN(toDateTime.getTime())) {
    throw new TypeError("Невалиден период");
  }

  if (toDateTime < fromDateTime) {
    throw new Error("Крайната дата трябва да е след началната");
  }

  const fromUtcIso = new Date(toUtcStartOfDateInTimeZone(fromDate, APP_TIME_ZONE)).toISOString();
  const toExclusiveDate = addOneDay(toDate);
  const toUtcExclusiveIso = new Date(
    toUtcStartOfDateInTimeZone(toExclusiveDate, APP_TIME_ZONE),
  ).toISOString();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("price_snapshot, quantity, orders!inner(status, closed_at)")
    .eq("orders.status", "closed")
    .gte("orders.closed_at", fromUtcIso)
    .lt("orders.closed_at", toUtcExclusiveIso);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);
}
