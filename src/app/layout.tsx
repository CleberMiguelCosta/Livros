import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: {
    default: "Estante",
    template: "%s · Estante",
  },
  description: "Cadastro de livros com filtros de autor e editora e busca de preços.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col md:flex-row">
        <ThemeProvider forcedTheme="light" enableSystem={false} attribute="class">
          <Suspense fallback={<div className="h-28 w-full bg-[oklch(0.29_0.045_35)] md:h-auto md:w-56" />}>
            <SiteHeader />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
