export type TableStatus = "free" | "occupied";
export type OrderStatus = "open" | "closed";
export type OrderItemStatus = "pending" | "preparing" | "ready" | "served";

export interface RestaurantTable {
  id: string;
  name: string;
  status: TableStatus;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface Order {
  id: string;
  table_id: string;
  status: OrderStatus;
  created_at: string;
  closed_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  status: OrderItemStatus;
  created_at: string;
  updated_at: string;
}

export interface KitchenItem extends OrderItem {
  table_name: string;
}
