import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";
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
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider forcedTheme="light" enableSystem={false} attribute="class">
          <Suspense
            fallback={
              <div className="flex min-h-svh w-full">
                <div className="hidden w-64 border-r bg-[oklch(0.29_0.045_35)] md:block" />
                <div className="flex-1 bg-background" />
              </div>
            }
          >
            <SiteShell>{children}</SiteShell>
          </Suspense>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
