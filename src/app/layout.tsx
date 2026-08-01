import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SiteHeader, STORE_NAME } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${STORE_NAME} — Shop`,
    template: `%s · ${STORE_NAME}`,
  },
  description: "A Storentia-powered storefront.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-black/5 dark:border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {STORE_NAME}. Powered by Storentia.
            </p>
            <nav className="flex gap-4">
              <Link href="/products" className="hover:underline">
                Products
              </Link>
              <Link href="/cart" className="hover:underline">
                Cart
              </Link>
              <Link href="/account" className="hover:underline">
                Account
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
