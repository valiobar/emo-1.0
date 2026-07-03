import { CURRENCY } from "@/lib/constants";
import { OrderItem } from "@/lib/types";

interface BillTotalProps {
  items: OrderItem[];
}

export function BillTotal({ items }: BillTotalProps) {
  const total = items.reduce(
    (sum, item) => sum + item.price_snapshot * item.quantity,
    0,
  );

  return (
    <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
      <span>Total</span>
      <span>
        {total.toFixed(2)} {CURRENCY}
      </span>
    </div>
  );
}
