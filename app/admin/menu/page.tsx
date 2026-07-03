import { createServiceRoleClient } from "@/lib/supabase/server";
import { MenuManager } from "./MenuManager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const supabase = createServiceRoleClient();

  const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] =
    await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*").order("name"),
  ]);

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }
  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return <MenuManager categories={categories ?? []} items={items ?? []} />;
}
