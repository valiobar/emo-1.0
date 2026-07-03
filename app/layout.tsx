import type { Metadata } from "next";
import "./globals.css";
import { HamburgerMenu } from "@/components/HamburgerMenu";

export const metadata: Metadata = {
  title: "emo - Поръчки",
  description: "Вътрешно приложение за сервитьори и кухня",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <HamburgerMenu />
        {children}
      </body>
    </html>
  );
}
