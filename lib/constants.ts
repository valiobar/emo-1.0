import { OrderItemStatus, TableStatus } from "./types";

export const CURRENCY = "EUR";
export const APP_TIME_ZONE = "Europe/Sofia";

export const STATUS_COLORS: Record<OrderItemStatus, string> = {
  pending: "bg-gray-200 text-gray-800 border-gray-400",
  preparing: "bg-yellow-100 text-yellow-800 border-yellow-400",
  ready: "bg-green-100 text-green-800 border-green-500",
  served: "bg-blue-100 text-blue-800 border-blue-400",
};

export const STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: "Чака",
  preparing: "Приготвя се",
  ready: "Готово",
  served: "Сервирано",
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  free: "Свободна",
  occupied: "Заета",
};
