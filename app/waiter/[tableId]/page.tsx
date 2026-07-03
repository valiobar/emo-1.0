import { createServiceRoleClient } from "@/lib/supabase/server";
import { OrderItem } from "@/lib/types";
import { notFound } from "next/navigation";
import { OrderView } from "./OrderView";

export const dynamic = "force-dynamic";

interface TableOrderPageProps {
  readonly params: Promise<{
    tableId: string;
  }>;
}

const PRIORITY_CATEGORY_NAMES = [
  "скара",
  "skara",
  "бира",
  "bira",
  "безалкохолни напитки",
  "bezalkoholni napitki",
  "гарнитури",
  "garnituri",
  "салати",
  "salati",
];

function normalizeCategoryName(name: string) {
  return name.trim().toLocaleLowerCase("bg-BG");
}

export default async function TableOrderPage({ params }: TableOrderPageProps) {
  const { tableId } = await params;
  const supabase = createServiceRoleClient();

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("*")
    .eq("id", tableId)
    .maybeSingle();

  if (tableError) {
    throw new Error(tableError.message);
  }

  if (!table) {
    notFound();
  }

  const { data: openOrder, error: openOrderError } = await supabase
    .from("orders")
    .select("id")
    .eq("table_id", table.id)
    .eq("status", "open")
    .maybeSingle();

  if (openOrderError) {
    throw new Error(openOrderError.message);
  }

  const [
    { data: categories, error: categoriesError },
    { data: items, error: itemsError },
  ] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*").eq("is_available", true),
  ]);

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }
  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const resolvedCategories = categories ?? [];
  const priorityByName = new Map(PRIORITY_CATEGORY_NAMES.map((name, index) => [name, index]));
  const sortedCategories = resolvedCategories
    .map((category, index) => ({ category, index }))
    .sort((a, b) => {
      const aPriority = priorityByName.get(normalizeCategoryName(a.category.name)) ?? Number.POSITIVE_INFINITY;
      const bPriority = priorityByName.get(normalizeCategoryName(b.category.name)) ?? Number.POSITIVE_INFINITY;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.category);

  let orderItems: OrderItem[] = [];
  if (openOrder?.id) {
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", openOrder.id)
      .order("created_at");

    if (orderItemsError) {
      throw new Error(orderItemsError.message);
    }

    orderItems = orderItemsData ?? [];
  }

  return (
    <OrderView
      table={table}
      orderId={openOrder?.id ?? null}
      categories={sortedCategories}
      menuItems={items ?? []}
      initialOrderItems={orderItems}
    />
  );
}
