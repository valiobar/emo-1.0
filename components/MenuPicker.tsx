"use client";

import { CURRENCY } from "@/lib/constants";
import { MenuCategory, MenuItem } from "@/lib/types";
import { useState, useTransition } from "react";

interface MenuPickerProps {
  readonly onConfirmItem: (menuItemId: string, quantity: number, notes: string) => void;
  readonly categories: MenuCategory[];
  readonly items: MenuItem[];
  readonly disabled?: boolean;
}

export function MenuPicker({ onConfirmItem, categories, items, disabled = false }: MenuPickerProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleItems = items.filter(
    (item) => item.category_id === activeCategory && item.is_available,
  );

  function resetSelection() {
    setSelectedItemId(null);
    setQuantity(1);
    setNotes("");
  }

  function selectItem(itemId: string) {
    if (selectedItemId === itemId) {
      resetSelection();
      return;
    }

    setSelectedItemId(itemId);
    setQuantity(1);
    setNotes("");
  }

  function handleConfirm(menuItemId: string) {
    startTransition(() => {
      onConfirmItem(menuItemId, quantity, notes.trim());
      resetSelection();
    });
  }

  return (
    <div className="text-gray-900">
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => {
              setActiveCategory(category.id);
              resetSelection();
            }}
            className={`min-h-10 whitespace-nowrap rounded-full px-3 py-2 text-sm ${
              activeCategory === category.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleItems.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
            Няма налични артикули в тази категория.
          </p>
        )}
        {visibleItems.map((item) => {
          const isSelected = selectedItemId === item.id;

          return (
            <article
              key={item.id}
              className={`rounded-xl border p-3 text-gray-900 shadow-sm transition ${
                isSelected
                  ? "col-span-2 border-sky-200 bg-sky-50 sm:col-span-3"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <button
                type="button"
                disabled={isPending || disabled}
                onClick={() => selectItem(item.id)}
                className="w-full text-left disabled:opacity-50"
              >
                <div className="font-medium">{item.name}</div>
                <div className={`${isSelected ? "text-sky-800" : "text-gray-500"} text-sm`}>
                  {item.price.toFixed(2)} {CURRENCY}
                </div>
              </button>

              {isSelected && (
                <div className="mt-3 border-t border-sky-200 pt-3">
                  <div className="text-sm font-medium text-sky-800">
                    {(item.price * quantity).toFixed(2)} {CURRENCY}
                  </div>

                  <label className="mt-2 block">
                    <span className="text-xs font-medium uppercase tracking-wide text-sky-700">
                      Бележки за кухнята
                    </span>
                    <input
                      type="text"
                      value={notes}
                      disabled={isPending || disabled}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="напр. без лук"
                      className="mt-1 min-h-10 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-indigo-200 transition placeholder:text-gray-400 focus:ring-2 disabled:opacity-50"
                    />
                  </label>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isPending || disabled || quantity <= 1}
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        className="min-h-10 min-w-10 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center font-semibold">{quantity}</span>
                      <button
                        type="button"
                        disabled={isPending || disabled}
                        onClick={() => setQuantity((prev) => prev + 1)}
                        className="min-h-10 min-w-10 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isPending || disabled}
                      onClick={() => handleConfirm(item.id)}
                      className="min-h-10 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                    >
                      Потвърди
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
