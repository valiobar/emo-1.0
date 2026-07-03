import Link from "next/link";
import { TABLE_STATUS_LABELS } from "@/lib/constants";
import { RestaurantTable } from "@/lib/types";

interface TableCardProps {
  readonly table: RestaurantTable;
  readonly readyCount: number;
}

export function TableCard({ table, readyCount }: TableCardProps) {
  const styles =
    table.status === "free"
      ? "border-emerald-200 bg-white"
      : "border-orange-200 bg-orange-50";

  return (
    <Link
      href={`/waiter/${table.id}`}
      prefetch={false}
      className={`relative block min-h-28 rounded-2xl border p-4 text-gray-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles}`}
    >
      <div className="text-lg font-semibold">{table.name}</div>
      <div
        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          table.status === "free"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-orange-100 text-orange-700"
        }`}
      >
        {TABLE_STATUS_LABELS[table.status]}
      </div>
      {readyCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-bold text-white shadow">
          {readyCount}
        </span>
      )}
    </Link>
  );
}
