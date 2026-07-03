"use client";

import { calculateEarningsByDateRange } from "@/app/actions/orders";
import { APP_TIME_ZONE, CURRENCY } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

interface EarningsWidgetProps {
  readonly earningsTotal: number;
}

function getTodayInputValue() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valueByType = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const year = valueByType.year;
  const month = valueByType.month;
  const day = valueByType.day;
  return `${year}-${month}-${day}`;
}

export function EarningsWidget({ earningsTotal }: EarningsWidgetProps) {
  const todayInputValue = getTodayInputValue();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState(todayInputValue);
  const [toDate, setToDate] = useState(todayInputValue);
  const [rangeTotal, setRangeTotal] = useState<number | null>(null);
  const [rangeLabel, setRangeLabel] = useState("");
  const [rangeError, setRangeError] = useState("");
  const initializedRef = useRef(false);

  const displayedTotal = rangeTotal ?? earningsTotal;

  function handleCalculateRange() {
    if (!fromDate || !toDate) {
      setRangeError("Моля, изберете начална и крайна дата.");
      return;
    }

    startTransition(async () => {
      try {
        const total = await calculateEarningsByDateRange(fromDate, toDate);
        setRangeTotal(total);
        setRangeLabel(`${fromDate} → ${toDate}`);
        setRangeError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Неуспешно изчисляване на периода.";
        setRangeError(message);
      }
    });
  }

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    startTransition(async () => {
      try {
        const total = await calculateEarningsByDateRange(todayInputValue, todayInputValue);
        setRangeTotal(total);
        setRangeLabel(`${todayInputValue} → ${todayInputValue}`);
        setRangeError("");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Неуспешно изчисляване на днешните приходи.";
        setRangeError(message);
      }
    });
  }, [startTransition, todayInputValue]);

  function handleRefreshValue() {
    startTransition(async () => {
      if (fromDate && toDate && rangeTotal !== null) {
        try {
          const total = await calculateEarningsByDateRange(fromDate, toDate);
          setRangeTotal(total);
          setRangeLabel(`${fromDate} → ${toDate}`);
          setRangeError("");
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Неуспешно обновяване на стойността.";
          setRangeError(message);
          return;
        }
      }

      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.1fr] md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Текущ приход</p>
            <button
              type="button"
              aria-label="Обнови стойността на приходите"
              title="Обнови стойността на приходите"
              disabled={isPending}
              onClick={handleRefreshValue}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:opacity-60"
            >
              ↻
            </button>
          </div>
          <p className="text-2xl font-bold">
            {displayedTotal.toFixed(2)} {CURRENCY}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {rangeLabel
              ? `Изчислено за ${rangeLabel} (${APP_TIME_ZONE}).`
              : `На база всички приключени поръчки (${APP_TIME_ZONE}).`}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-gray-500">Период</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr]">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="min-h-10 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-indigo-200 transition focus:ring-2"
            />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleCalculateRange}
              className="min-h-10 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Изчисли
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setRangeTotal(null);
                setRangeLabel("");
                setRangeError("");
              }}
              className="min-h-10 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:opacity-60"
            >
              Изчисти
            </button>
          </div>
        </div>
      </div>
      {rangeError ? <p className="mt-2 text-sm text-rose-600">{rangeError}</p> : null}
    </section>
  );
}
