"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

interface CreateMenuItemInput {
  categoryId: string;
  name: string;
  price: number;
}

interface UpdateMenuItemInput {
  name?: string;
  price?: number;
  isAvailable?: boolean;
}

export async function createCategory(name: string, sortOrder = 0) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("menu_categories")
    .insert({ name, sort_order: sortOrder });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  revalidatePath("/waiter");
}

export async function deleteCategory(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  revalidatePath("/waiter");
}

export async function createMenuItem(input: CreateMenuItemInput) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("menu_items").insert({
    category_id: input.categoryId,
    name: input.name,
    price: input.price,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  revalidatePath("/waiter");
}

export async function updateMenuItem(id: string, input: UpdateMenuItemInput) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: input.name,
      price: input.price,
      is_available: input.isAvailable,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  revalidatePath("/waiter");
}

export async function deleteMenuItem(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  revalidatePath("/waiter");
}
