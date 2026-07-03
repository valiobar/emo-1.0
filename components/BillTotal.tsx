import { CURRENCY } from "@/lib/constants";
import { OrderItem } from "@/lib/types";

interface BillTotalProps {
  readonly items: OrderItem[];
}

export function BillTotal({ items }: BillTotalProps) {
  const total = items.reduce(
    (sum, item) => sum + item.price_snapshot * item.quantity,
    0,
  );

  return (
    <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3 text-lg font-bold text-gray-900">
      <span>Общо</span>
      <span>
        {total.toFixed(2)} {CURRENCY}
      </span>
    </div>
  );
}
