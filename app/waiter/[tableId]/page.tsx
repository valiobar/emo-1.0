import { openOrderForTable } from "@/app/actions/orders";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderView } from "./OrderView";

export const dynamic = "force-dynamic";

interface TableOrderPageProps {
  params: Promise<{
    tableId: string;
  }>;
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

  const orderId = await openOrderForTable(table.id);

  const [
    { data: categories, error: categoriesError },
    { data: items, error: itemsError },
    { data: orderItems, error: orderItemsError },
  ] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*").eq("is_available", true),
    supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
  ]);

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }
  if (itemsError) {
    throw new Error(itemsError.message);
  }
  if (orderItemsError) {
    throw new Error(orderItemsError.message);
  }

  return (
    <OrderView
      table={table}
      orderId={orderId}
      categories={categories ?? []}
      menuItems={items ?? []}
      initialOrderItems={orderItems ?? []}
    />
  );
}
