import Link from "next/link";
import { RestaurantTable } from "@/lib/types";

interface TableCardProps {
  table: RestaurantTable;
  readyCount: number;
}

export function TableCard({ table, readyCount }: TableCardProps) {
  const styles =
    table.status === "free"
      ? "bg-white border-gray-300"
      : "bg-orange-50 border-orange-400";

  return (
    <Link
      href={`/waiter/${table.id}`}
      className={`relative block rounded-lg border p-4 shadow-sm transition hover:shadow-md ${styles}`}
    >
      <div className="text-lg font-semibold">{table.name}</div>
      <div className="text-sm capitalize text-gray-500">{table.status}</div>
      {readyCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
          {readyCount}
        </span>
      )}
    </Link>
  );
}
