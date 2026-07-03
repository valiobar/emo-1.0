import { EarningsWidget } from "@/components/EarningsWidget";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Link from "next/link";

const LINKS = [
  {
    href: "/waiter",
    label: "Сервитьор",
    description: "Приемайте поръчки и управлявайте сметките по маси",
    icon: "🧾",
  },
  {
    href: "/kitchen",
    label: "Кухня",
    description: "Следете чакащите, приготвяните и готовите артикули",
    icon: "👨‍🍳",
  },
  {
    href: "/admin/menu",
    label: "Админ - Меню",
    description: "Създавайте и редактирайте категории и ястия",
    icon: "🍽️",
  },
  {
    href: "/admin/tables",
    label: "Админ - Маси",
    description: "Добавяйте, преименувайте и премахвайте ресторантски маси",
    icon: "🪑",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let earningsTotal = 0;
  let earningsError = "";

  try {
    const supabase = createServiceRoleClient();
    const { data: closedOrderItems, error: closedOrderItemsError } = await supabase
      .from("order_items")
      .select("price_snapshot, quantity, orders!inner(status)")
      .eq("orders.status", "closed");

    if (closedOrderItemsError) {
      throw new Error(closedOrderItemsError.message);
    }

    earningsTotal = (closedOrderItems ?? []).reduce(
      (sum, item) => sum + item.price_snapshot * item.quantity,
      0,
    );
  } catch (error) {
    console.error("Failed to load earnings on home page:", error);
    earningsError = "Неуспешно зареждане на приходите. Проверете сървърната конфигурация.";
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#94a3b81a,transparent_50%),radial-gradient(circle_at_bottom,#94a3b80f,transparent_45%)]" />

      <section className="relative w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-5 shadow-xl sm:p-7">
        <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Ресторантски поръчки
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Изберете работен панел, за да продължите.
        </p>
        {earningsError ? (
          <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
            {earningsError}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-gray-900 transition duration-200 hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl transition group-hover:border-indigo-200 group-hover:bg-indigo-50">
                {link.icon}
              </span>
              <span className="flex flex-col">
                <span className="text-base font-semibold leading-tight">{link.label}</span>
                <span className="text-xs text-gray-600">
                  {link.description}
                </span>
              </span>
            </Link>
          ))}
        </div>

        <EarningsWidget earningsTotal={earningsTotal} />
      </section>
    </main>
  );
}
