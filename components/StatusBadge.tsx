import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import { OrderItemStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: OrderItemStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
