"use client";

import { addOrderItem } from "@/app/actions/orders";
import { CURRENCY } from "@/lib/constants";
import { MenuCategory, MenuItem } from "@/lib/types";
import { useState, useTransition } from "react";

interface MenuPickerProps {
  orderId: string;
  categories: MenuCategory[];
  items: MenuItem[];
}

export function MenuPicker({ orderId, categories, items }: MenuPickerProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [isPending, startTransition] = useTransition();

  const visibleItems = items.filter(
    (item) => item.category_id === activeCategory && item.is_available,
  );

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              activeCategory === category.id ? "bg-black text-white" : "bg-gray-100"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => addOrderItem(orderId, item.id, 1))}
            className="rounded-lg border p-3 text-left hover:bg-gray-50 disabled:opacity-50"
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
