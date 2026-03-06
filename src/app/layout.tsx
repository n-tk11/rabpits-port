import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";

import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <header className="border-b bg-background">
            <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
              <Link href="/" className="text-sm font-semibold tracking-tight">
                📈 Portfolio Tracker
              </Link>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Dashboard
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
              <Link
                href="/assets/prices"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Update Prices
              </Link>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
