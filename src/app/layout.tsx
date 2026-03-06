import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Self-hosted personal financial portfolio tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="border-b bg-background">
          <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
            <Link href="/portfolios" className="text-sm font-semibold tracking-tight">
              📈 Portfolio Tracker
            </Link>
            <Link
              href="/portfolios"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Portfolios
            </Link>
            <Link href="/assets" className="text-sm text-muted-foreground hover:text-foreground">
              Assets
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
