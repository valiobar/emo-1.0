import Link from "next/link";

const LINKS = [
  { href: "/waiter", label: "Waiter" },
  { href: "/kitchen", label: "Kitchen" },
  { href: "/admin/menu", label: "Admin - Menu" },
  { href: "/admin/tables", label: "Admin - Tables" },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Restaurant Orders</h1>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border px-6 py-3 text-center hover:bg-gray-100"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
