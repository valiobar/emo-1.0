"use client";

import { addOrderItem } from "@/app/actions/orders";
import { CURRENCY } from "@/lib/constants";
import { MenuCategory, MenuItem } from "@/lib/types";
import { useState, useTransition } from "react";

interface MenuPickerProps {
  readonly orderId: string;
  readonly categories: MenuCategory[];
  readonly items: MenuItem[];
}

export function MenuPicker({ orderId, categories, items }: MenuPickerProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [isPending, startTransition] = useTransition();

  const visibleItems = items.filter(
    (item) => item.category_id === activeCategory && item.is_available,
  );

  return (
    <div className="text-gray-900">
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
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
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => addOrderItem(orderId, item.id, 1))}
            className="min-h-10 rounded-xl border border-gray-200 bg-white p-3 text-left text-gray-900 shadow-sm hover:-translate-y-0.5 hover:bg-gray-50 disabled:opacity-50"
          >
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-gray-500">
              {item.price.toFixed(2)} {CURRENCY}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
