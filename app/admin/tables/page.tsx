import { createServiceRoleClient } from "@/lib/supabase/server";
import { TablesManager } from "./TablesManager";

export const dynamic = "force-dynamic";

export default async function AdminTablesPage() {
  const supabase = createServiceRoleClient();
  const { data: tables, error } = await supabase.from("tables").select("*").order("name");

  if (error) {
    throw new Error(error.message);
  }

  return <TablesManager tables={tables ?? []} />;
}
