"use client";

import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  updateMenuItem,
} from "@/app/actions/menu";
import { IconActionButton } from "@/components/IconActionButton";
import { CURRENCY } from "@/lib/constants";
import { MenuCategory, MenuItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

interface MenuManagerProps {
  readonly categories: MenuCategory[];
  readonly items: MenuItem[];
}

export function MenuManager({ categories, items }: MenuManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? "");
  const [newItem, setNewItem] = useState({
    categoryId: categories[0]?.id ?? "",
    name: "",
    price: "",
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState({
    name: "",
    price: "",
    isAvailable: true,
  });

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId("");
      setNewItem((prev) => ({ ...prev, categoryId: "" }));
      return;
    }

    const selectedCategoryStillExists = categories.some(
      (category) => category.id === selectedCategoryId,
    );
    if (!selectedCategoryStillExists) {
      setSelectedCategoryId(categories[0].id);
    }

    const selectedNewItemCategoryStillExists = categories.some(
      (category) => category.id === newItem.categoryId,
    );
    if (!selectedNewItemCategoryStillExists) {
      setNewItem((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, newItem.categoryId, selectedCategoryId]);

  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) {
      return items;
    }
    return items.filter((item) => item.category_id === selectedCategoryId);
  }, [items, selectedCategoryId]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }

    await createCategory(name);
    setNewCategoryName("");
    refresh();
  }

  async function handleCreateItem() {
    const name = newItem.name.trim();
    const price = Number.parseFloat(newItem.price);

    if (!newItem.categoryId || !name || Number.isNaN(price)) {
      return;
    }

    await createMenuItem({
      categoryId: newItem.categoryId,
      name,
      price,
    });

    setNewItem((prev) => ({ ...prev, name: "", price: "" }));
    refresh();
  }

  function startEditItem(item: MenuItem) {
    setEditingItemId(item.id);
    setEditItem({
      name: item.name,
      price: item.price.toFixed(2),
      isAvailable: item.is_available,
    });
  }

  async function handleSaveItem(itemId: string) {
    const name = editItem.name.trim();
    const price = Number.parseFloat(editItem.price);
    if (!name || Number.isNaN(price)) {
      return;
    }

    await updateMenuItem(itemId, {
      name,
      price,
      isAvailable: editItem.isAvailable,
    });

    setEditingItemId(null);
    refresh();
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 text-gray-900 sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Админ панел</p>
          <h1 className="text-3xl font-bold tracking-tight">Управление на менюто</h1>
          <p className="mt-1 text-sm text-gray-600">
            Управлявайте категориите и ястията, използвани от сервитьорите.
          </p>
        </div>
        <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
          {categories.length} категории · {items.length} артикула
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Категории</h2>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
              {categories.length}
            </span>
          </div>

          <div className="space-y-2">
            {categories.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
                Все още няма категории. Добавете първата по-долу.
              </p>
            )}

            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id;

              return (
                <div
                  key={category.id}
                  className={`flex min-h-10 items-center justify-between gap-2 rounded-xl border px-2 py-2 ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setNewItem((prev) => ({ ...prev, categoryId: category.id }));
                    }}
                    className={`min-h-10 flex-1 rounded-lg px-2 text-left font-medium ${
                      isSelected ? "text-indigo-700" : "text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {category.name}
                  </button>
                  <IconActionButton
                    onClick={async () => {
                      await deleteCategory(category.id);
                      refresh();
                    }}
                    label="Изтрий категория"
                    title="Изтрий категория"
                    tone="danger"
                  >
                    🗑
                  </IconActionButton>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Име на нова категория"
              className="min-h-10 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none ring-indigo-200 transition focus:ring-2"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={handleCreateCategory}
              className="min-h-10 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Добави категория
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ястия</h2>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
              {filteredItems.length} показани
            </span>
          </div>

          <div className="space-y-2">
            {filteredItems.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
                Все още няма ястия в тази категория. Създайте първото по-долу.
              </p>
            )}

            {filteredItems.map((item) => {
              const isEditing = editingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  {isEditing ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input
                        value={editItem.name}
                        onChange={(event) =>
                          setEditItem((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
                      />
                      <input
                        value={editItem.price}
                        onChange={(event) =>
                          setEditItem((prev) => ({ ...prev, price: event.target.value }))
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
                      />
                      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editItem.isAvailable}
                          onChange={(event) =>
                            setEditItem((prev) => ({
                              ...prev,
                              isAvailable: event.target.checked,
                            }))
                          }
                        />
                        <span>Налично</span>
                      </label>
                      <div className="flex gap-2 sm:col-span-3">
                        <IconActionButton
                          onClick={() => handleSaveItem(item.id)}
                          label="Запази промените"
                          title="Запази промените"
                          tone="primary"
                          disabled={isPending}
                        >
                          ✓
                        </IconActionButton>
                        <IconActionButton
                          onClick={() => setEditingItemId(null)}
                          label="Отказ"
                          title="Отказ"
                        >
                          ✕
                        </IconActionButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-10 items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.price.toFixed(2)} {CURRENCY}
                          {item.is_available ? "" : " · Скрито"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconActionButton
                          onClick={() => startEditItem(item)}
                          label="Редактирай ястие"
                          title="Редактирай ястие"
                          tone="primary"
                        >
                          ✎
                        </IconActionButton>
                        <IconActionButton
                          onClick={async () => {
                            await deleteMenuItem(item.id);
                            refresh();
                          }}
                          label="Изтрий ястие"
                          title="Изтрий ястие"
                          tone="danger"
                        >
                          🗑
                        </IconActionButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={newItem.categoryId}
              onChange={(event) =>
                setNewItem((prev) => ({ ...prev, categoryId: event.target.value }))
              }
              className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              value={newItem.name}
              onChange={(event) =>
                setNewItem((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Име на ястие"
              className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none ring-indigo-200 transition focus:ring-2"
            />
            <input
              value={newItem.price}
              onChange={(event) =>
                setNewItem((prev) => ({ ...prev, price: event.target.value }))
              }
              placeholder="Цена"
              type="number"
              min="0"
              step="0.01"
              className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none ring-indigo-200 transition focus:ring-2"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={handleCreateItem}
              className="min-h-10 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
            >
              Добави ястие
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
