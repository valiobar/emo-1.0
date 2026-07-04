import { createServiceRoleClient } from "@/lib/supabase/server";
import { APP_TIME_ZONE } from "@/lib/constants";
import { AdminDashboard } from "./AdminDashboard";
import { AdminOrderRow } from "./types";

export const dynamic = "force-dynamic";

interface OrdersSearchParams {
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly tableId?: string;
}

function toYmdInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseYmd(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
}

function addOneDay(value: string) {
  const parsed = parseYmd(value);
  if (!parsed) {
    return value;
  }
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + 1);
  return toYmdInTimeZone(date, "UTC");
}

function normalizeDateInput(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }
  return parseYmd(value) ? value : fallback;
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
  const parsed = parseYmd(dateInput);
  if (!parsed) {
    throw new TypeError("Невалиден период");
  }
  const localMidnightAsUtcGuess = Date.UTC(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0);

  let utcMillis = localMidnightAsUtcGuess;
  for (let i = 0; i < 2; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(new Date(utcMillis), timeZone);
    utcMillis = localMidnightAsUtcGuess - offsetMs;
  }

  return utcMillis;
}

export default async function AdminPage({
  searchParams,
}: {
  readonly searchParams?: Promise<OrdersSearchParams>;
}) {
  const today = toYmdInTimeZone(new Date(), APP_TIME_ZONE);
  const resolvedSearchParams = (await searchParams) ?? {};

  let fromDate = normalizeDateInput(resolvedSearchParams?.fromDate, today);
  let toDate = normalizeDateInput(resolvedSearchParams?.toDate, today);
  const selectedTableId = (resolvedSearchParams?.tableId ?? "").trim();

  if (fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  let dataError = "";
  let categories: { id: string; name: string; sort_order: number }[] = [];
  let items: {
    id: string;
    category_id: string;
    name: string;
    price: number;
    is_available: boolean;
  }[] = [];
  let tables: { id: string; name: string; status: "free" | "occupied"; created_at: string }[] = [];
  let orders: AdminOrderRow[] = [];

  try {
    const supabase = createServiceRoleClient();
    const [{ data: categoriesData, error: categoriesError }, { data: itemsData, error: itemsError }, { data: tablesData, error: tablesError }] =
      await Promise.all([
        supabase.from("menu_categories").select("*").order("sort_order"),
        supabase.from("menu_items").select("*").order("name"),
        supabase.from("tables").select("*").order("name"),
      ]);

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }
    if (itemsError) {
      throw new Error(itemsError.message);
    }
    if (tablesError) {
      throw new Error(tablesError.message);
    }

    categories = categoriesData ?? [];
    items = itemsData ?? [];
    tables = tablesData ?? [];

    const fromIso = new Date(toUtcStartOfDateInTimeZone(fromDate, APP_TIME_ZONE)).toISOString();
    const toExclusiveIso = new Date(
      toUtcStartOfDateInTimeZone(addOneDay(toDate), APP_TIME_ZONE),
    ).toISOString();

    let ordersQuery = supabase
      .from("orders")
      .select("id, table_id, status, created_at, closed_at, tables(name), order_items(name_snapshot, quantity, price_snapshot)")
      .gte("created_at", fromIso)
      .lt("created_at", toExclusiveIso)
      .order("created_at", { ascending: false });

    if (selectedTableId) {
      ordersQuery = ordersQuery.eq("table_id", selectedTableId);
    }

    const { data: ordersData, error: ordersError } = await ordersQuery;
    if (ordersError) {
      throw new Error(ordersError.message);
    }

    orders = (ordersData ?? [])
      .map((order) => {
        const tableRelation = order.tables as { name: string } | { name: string }[] | null;
        const tableName = Array.isArray(tableRelation)
          ? tableRelation[0]?.name ?? "Неизвестна маса"
          : tableRelation?.name ?? "Неизвестна маса";
        const orderItems = order.order_items ?? [];
        const itemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = orderItems.reduce(
          (sum, item) => sum + item.quantity * item.price_snapshot,
          0,
        );

        return {
          id: order.id,
          tableId: order.table_id,
          tableName,
          status: order.status,
          createdAt: order.created_at,
          closedAt: order.closed_at,
          itemsCount,
          totalAmount,
          items: orderItems.map((item) => ({
            nameSnapshot: item.name_snapshot,
            quantity: item.quantity,
            priceSnapshot: item.price_snapshot,
          })),
        };
      })
      .filter((order) => order.itemsCount > 0);
  } catch (error) {
    console.error("Failed to load admin dashboard page:", error);
    dataError = "Неуспешно зареждане на данните за админ панела.";
  }

  if (dataError) {
    return (
      <main className="mx-auto w-full max-w-7xl p-4 text-gray-900 sm:p-6">
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {dataError}
        </p>
      </main>
    );
  }

  return (
    <AdminDashboard
      categories={categories}
      items={items}
      tables={tables}
      orders={orders}
      fromDate={fromDate}
      toDate={toDate}
      selectedTableId={selectedTableId}
    />
  );
}
