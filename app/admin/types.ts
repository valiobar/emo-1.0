export interface AdminOrderRow {
  readonly id: string;
  readonly tableId: string;
  readonly tableName: string;
  readonly status: "open" | "closed";
  readonly createdAt: string;
  readonly closedAt: string | null;
  readonly itemsCount: number;
  readonly totalAmount: number;
}
