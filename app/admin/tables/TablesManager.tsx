"use client";

import { createTable, deleteTable, renameTable } from "@/app/actions/tables";
import { TABLE_STATUS_LABELS } from "@/lib/constants";
import { RestaurantTable } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface TablesManagerProps {
  readonly tables: RestaurantTable[];
}

interface IconActionButtonProps {
  readonly onClick: () => void;
  readonly label: string;
  readonly title: string;
  readonly disabled?: boolean;
  readonly tone?: "neutral" | "primary" | "danger";
  readonly children: React.ReactNode;
}

function IconActionButton({
  onClick,
  label,
  title,
  disabled = false,
  tone = "neutral",
  children,
}: IconActionButtonProps) {
  let toneClass = "text-gray-700 hover:bg-gray-100";
  if (tone === "danger") {
    toneClass = "text-red-600 hover:bg-red-50";
  } else if (tone === "primary") {
    toneClass = "text-indigo-700 hover:bg-indigo-50";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent ${toneClass} disabled:opacity-60`}
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function TablesManager({ tables }: TablesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleCreateTable() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    await createTable(trimmedName);
    setName("");
    refresh();
  }

  function startEditingTable(table: RestaurantTable) {
    setEditingTableId(table.id);
    setEditingName(table.name);
  }

  async function handleSaveTableName(tableId: string) {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      return;
    }

    await renameTable(tableId, trimmedName);
    setEditingTableId(null);
    setEditingName("");
    refresh();
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 text-gray-900 sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Админ панел</p>
          <h1 className="text-3xl font-bold tracking-tight">Управление на масите</h1>
          <p className="mt-1 text-sm text-gray-600">
            Добавяйте или премахвайте маси, използвани в изгледа на сервитьора.
          </p>
        </div>
        <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
          {tables.length} общо маси
        </div>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
        <div className="space-y-2">
          {tables.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              Все още няма конфигурирани маси. Добавете първата маса по-долу.
            </p>
          )}

          {tables.map((table) => {
            const isEditing = editingTableId === table.id;

            return (
              <div
                key={table.id}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
              >
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
                    />
                    <IconActionButton
                      onClick={async () => {
                        try {
                          await handleSaveTableName(table.id);
                        } catch (error) {
                          alert((error as Error).message);
                        }
                      }}
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
                        setEditingName("");
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
                          try {
                            await deleteTable(table.id);
                            refresh();
                          } catch (error) {
                            alert((error as Error).message);
                          }
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
            value={name}
            onChange={(event) => setName(event.target.value)}
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
    </main>
  );
}
