import { KitchenItem } from "@/lib/types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { KitchenBoard } from "./KitchenBoard";

export const dynamic = "force-dynamic";

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

async function fetchKitchenItems(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<KitchenItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("*, orders!inner(status, tables(name))")
    .in("status", ["pending", "preparing", "ready"])
    .eq("orders.status", "open")
    .order("created_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...(row as Omit<KitchenItem, "table_name">),
    table_name: extractTableNameFromKitchenRow(row),
  }));
}

export default async function KitchenPage() {
  let items: KitchenItem[] = [];
  let dataError = "";

  try {
    const supabase = createServiceRoleClient();
    items = await fetchKitchenItems(supabase);
  } catch (error) {
    console.error("Failed to load kitchen page data:", error);
    dataError = "Неуспешно зареждане на данните за кухнята.";
  }

  const activeCount = items.length;

  return (
    <main className="mx-auto w-full max-w-7xl p-4 text-gray-900 sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Кухненски панел</p>
          <h1 className="text-3xl font-bold tracking-tight">Кухня</h1>
          <p className="mt-1 text-sm text-gray-600">
            Поток на поръчките в реално време между чакащи, приготвяни и готови артикули.
          </p>
        </div>
        <div className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
          {activeCount} активни артикула
        </div>
      </header>
      {dataError ? (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {dataError}
        </p>
      ) : null}
      <KitchenBoard initialItems={items} />
    </main>
  );
}
