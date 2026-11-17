"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const LINKS = [
  { href: "/", label: "Acervo" },
  { href: "/livros/novo", label: "Cadastrar" },
  { href: "/precos", label: "Preços" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/20 bg-[oklch(0.29_0.045_35)] text-[oklch(0.96_0.014_90)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Link href="/" className="group">
            <p className="font-heading text-4xl leading-none tracking-tight italic">Estante</p>
            <p className="mt-1 text-[0.7rem] tracking-[0.22em] text-[oklch(0.8_0.04_75)] uppercase">
              Biblioteca e preços
            </p>
          </Link>
          <p className="max-w-xs text-sm text-[oklch(0.86_0.02_80)]">
            Cadastre o que você tem, filtre por autor e editora, e veja o preço de hoje.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Seções">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[oklch(0.96_0.014_90)] text-[oklch(0.29_0.045_35)]"
                    : "text-[oklch(0.9_0.02_85)] hover:bg-white/10",
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
