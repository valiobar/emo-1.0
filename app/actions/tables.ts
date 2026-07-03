"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function createTable(name: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("tables")
    .insert({ name, status: "free" });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/waiter");
  revalidatePath("/admin/tables");
  revalidatePath("/admin");
}

export async function renameTable(id: string, name: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("tables").update({ name }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/waiter");
  revalidatePath("/admin/tables");
  revalidatePath("/admin");
}

export async function deleteTable(id: string) {
  const supabase = createServiceRoleClient();
  const { data: openOrder, error: openOrderError } = await supabase
    .from("orders")
    .select("id")
    .eq("table_id", id)
    .eq("status", "open")
    .maybeSingle();

  if (openOrderError) {
    throw new Error(openOrderError.message);
  }

  if (openOrder) {
    throw new Error("Не може да изтриете маса с отворена поръчка");
  }

  const { error } = await supabase.from("tables").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/waiter");
  revalidatePath("/admin/tables");
  revalidatePath("/admin");
}
