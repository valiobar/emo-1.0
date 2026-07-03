"use client";

import { createTable, deleteTable, renameTable } from "@/app/actions/tables";
import { IconActionButton } from "@/components/IconActionButton";
import { TABLE_STATUS_LABELS } from "@/lib/constants";
import { RestaurantTable } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface TablesSectionProps {
  readonly tables: RestaurantTable[];
}

async function runWithErrorHandling(work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    alert((error as Error).message);
  }
}

export function TablesSection({ tables }: TablesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [newTableName, setNewTableName] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState("");

  function refresh() {
    startTransition(() => router.refresh());
  }

  function startEditingTable(table: RestaurantTable) {
    setEditingTableId(table.id);
    setEditingTableName(table.name);
  }

  async function handleCreateTable() {
    const trimmedName = newTableName.trim();
    if (!trimmedName) {
      return;
    }

    await runWithErrorHandling(async () => {
      await createTable(trimmedName);
      setNewTableName("");
      refresh();
    });
  }

  async function handleSaveTableName(tableId: string) {
    const trimmedName = editingTableName.trim();
    if (!trimmedName) {
      return;
    }

    await runWithErrorHandling(async () => {
      await renameTable(tableId, trimmedName);
      setEditingTableId(null);
      setEditingTableName("");
      refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Маси</h2>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{tables.length}</span>
      </div>

      <div className="max-h-112 space-y-2 overflow-y-auto pr-1 md:max-h-128">
        {tables.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
            Все още няма конфигурирани маси. Добавете първата маса по-долу.
          </p>
        )}

        {tables.map((table) => {
          const isEditing = editingTableId === table.id;

          return (
            <div key={table.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              {isEditing ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    value={editingTableName}
                    onChange={(event) => setEditingTableName(event.target.value)}
                    className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
                  />
                  <IconActionButton
                    onClick={() => handleSaveTableName(table.id)}
                    label="Запази името на масата"
                    title="Запази"
                    tone="primary"
                    disabled={isPending}
                  >
                    ✓
                  </IconActionButton>
                  <IconActionButton
                    onClick={() => {
                      setEditingTableId(null);
                      setEditingTableName("");
                    }}
                    label="Отказ"
                    title="Отказ"
                  >
                    ✕
                  </IconActionButton>
                </div>
              ) : (
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{table.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        table.status === "occupied"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {TABLE_STATUS_LABELS[table.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconActionButton
                      onClick={() => startEditingTable(table)}
                      label="Редактирай маса"
                      title="Редактирай маса"
                      tone="primary"
                    >
                      ✎
                    </IconActionButton>
                    <IconActionButton
                      onClick={async () => {
                        await runWithErrorHandling(async () => {
                          await deleteTable(table.id);
                          refresh();
                        });
                      }}
                      label="Изтрий маса"
                      title="Изтрий маса"
                      tone="danger"
                    >
                      🗑
                    </IconActionButton>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={newTableName}
          onChange={(event) => setNewTableName(event.target.value)}
          placeholder="Име на маса (напр. Тераса 2)"
          className="min-h-10 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none ring-indigo-200 transition focus:ring-2"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={handleCreateTable}
          className="min-h-10 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Добави маса
        </button>
      </div>
    </section>
  );
}
