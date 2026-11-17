"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const LINKS = [
  { href: "/", label: "Acervo" },
  { href: "/metas", label: "Metas" },
  { href: "/livros/novo", label: "Cadastrar" },
  { href: "/precos", label: "Preços" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-black/20 bg-[oklch(0.29_0.045_35)] text-[oklch(0.96_0.014_90)] md:w-56 md:border-r md:border-b-0">
      <div className="flex flex-col gap-5 px-4 py-5 sm:px-5 md:sticky md:top-0 md:min-h-full">
        <Link href="/" className="group inline-flex w-fit" aria-label="Estante — início">
          <OpenBookMark className="size-[3cm] transition-transform group-hover:scale-[1.03]" />
        </Link>

        <nav className="flex flex-row gap-1.5 md:flex-col md:gap-1" aria-label="Seções">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors md:w-full",
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

        <p className="mt-auto hidden text-sm text-[oklch(0.86_0.02_80)] md:block">
          Cadastre o que você tem, filtre por autor e editora, e veja o preço de hoje.
        </p>
      </div>
    </aside>
  );
}

function OpenBookMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 28c18-10 32-8 50 2 18-10 32-12 50-2v62c-18-8-32-6-50 4-18-10-32-12-50-4V28Z"
        fill="oklch(0.92 0.02 85)"
        stroke="oklch(0.96 0.014 90)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M60 30v64"
        stroke="oklch(0.45 0.08 35)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M22 42h28M22 54h26M22 66h24M22 78h20"
        stroke="oklch(0.55 0.05 40)"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M70 42h28M72 54h26M74 66h24M78 78h20"
        stroke="oklch(0.55 0.05 40)"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M10 90c18-8 32-6 50 4 18-10 32-12 50-4"
        stroke="oklch(0.75 0.04 70)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
