import { createServiceRoleClient } from "@/lib/supabase/server";
import { MenuManager } from "./MenuManager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  let categories: { id: string; name: string; sort_order: number }[] = [];
  let items: {
    id: string;
    category_id: string;
    name: string;
    price: number;
    is_available: boolean;
  }[] = [];
  let dataError = "";

  try {
    const supabase = createServiceRoleClient();
    const [{ data: categoriesData, error: categoriesError }, { data: itemsData, error: itemsError }] =
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
    categories = categoriesData ?? [];
    items = itemsData ?? [];
  } catch (error) {
    console.error("Failed to load admin menu page:", error);
    dataError = "Неуспешно зареждане на данните за менюто.";
  }

  if (dataError) {
    return (
      <main className="mx-auto w-full max-w-5xl p-4 text-gray-900 sm:p-6">
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {dataError}
        </p>
      </main>
    );
  }

  return <MenuManager categories={categories} items={items} />;
}
