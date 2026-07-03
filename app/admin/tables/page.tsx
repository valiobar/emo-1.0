import { createServiceRoleClient } from "@/lib/supabase/server";
import { TablesManager } from "./TablesManager";

export const dynamic = "force-dynamic";

export default async function AdminTablesPage() {
  try {
    const supabase = createServiceRoleClient();
    const { data: tables, error } = await supabase.from("tables").select("*").order("name");

    if (error) {
      throw new Error(error.message);
    }

    return <TablesManager tables={tables ?? []} />;
  } catch (error) {
    console.error("Failed to load admin tables page:", error);
    return (
      <main className="mx-auto w-full max-w-3xl p-4 text-gray-900 sm:p-6">
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Неуспешно зареждане на данните за масите.
        </p>
      </main>
    );
  }
}
