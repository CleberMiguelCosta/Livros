"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const SECTION_LABELS: { match: (path: string) => boolean; label: string; href?: string }[] = [
  { match: (p) => p === "/", label: "Acervo" },
  { match: (p) => p.startsWith("/metas"), label: "Metas" },
  { match: (p) => p === "/livros/novo", label: "Cadastrar" },
  { match: (p) => p.startsWith("/livros/"), label: "Livro", href: "/" },
  { match: (p) => p.startsWith("/precos"), label: "Preços" },
];

function useBreadcrumb() {
  const pathname = usePathname();
  const section = SECTION_LABELS.find((s) => s.match(pathname));

  if (!section || pathname === "/") {
    return { parent: null as string | null, current: section?.label ?? "Acervo" };
  }

  if (section.href) {
    return { parent: "Acervo", parentHref: "/", current: section.label };
  }

  return { parent: null as string | null, current: section.label };
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const crumb = useBreadcrumb();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink render={<Link href="/" />}>
                      Estante
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  {crumb.parent ? (
                    <>
                      <BreadcrumbItem className="hidden sm:block">
                        <BreadcrumbLink
                          render={<Link href={crumb.parentHref ?? "/"} />}
                        >
                          {crumb.parent}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden sm:block" />
                    </>
                  ) : null}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{crumb.current}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
