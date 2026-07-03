"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Начало" },
  { href: "/waiter", label: "Сервитьор" },
  { href: "/kitchen", label: "Кухня" },
  { href: "/admin", label: "Админ" },
];

export function HamburgerMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 top-4 z-50">
      <button
        type="button"
        aria-label="Отвори навигационното меню"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <span className="text-xl leading-none">☰</span>
      </button>

      {open ? (
        <nav className="mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
