"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LibraryIcon,
  PlusCircleIcon,
  TargetIcon,
  TagsIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV = [
  { href: "/", label: "Acervo", icon: LibraryIcon },
  { href: "/metas", label: "Metas", icon: TargetIcon },
  { href: "/livros/novo", label: "Cadastrar", icon: PlusCircleIcon },
  { href: "/precos", label: "Preços", icon: TagsIcon },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return (
      pathname === "/" ||
      (pathname.startsWith("/livros/") && pathname !== "/livros/novo")
    );
  }
  return pathname.startsWith(href);
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              tooltip="Estante"
              className="group/brand h-auto! w-auto! justify-center p-1! group-data-[collapsible=icon]:size-auto! group-data-[collapsible=icon]:p-0!"
              aria-label="Estante — início"
            >
              <OpenBookMark className="size-[3cm]! transition-transform group-hover/brand:scale-105 group-data-[collapsible=icon]:size-8!" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.label}
                      aria-current={active ? "page" : undefined}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <p className="px-2 pb-2 text-xs leading-relaxed text-sidebar-foreground/70">
          Cadastre o que você tem, filtre por autor e editora, e veja o preço de
          hoje.
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
