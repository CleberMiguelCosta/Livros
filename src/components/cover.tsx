import { cn } from "cn";
import { corStatus, labelStatus } from "@/lib/metas";
import type { StatusLeitura } from "@/lib/types";

const CLOTHS = [
  "oklch(0.4 0.1 28)",
  "oklch(0.36 0.06 155)",
  "oklch(0.34 0.06 250)",
  "oklch(0.45 0.09 70)",
  "oklch(0.38 0.07 320)",
];

export function Cover({
  titulo,
  capaUrl,
  className,
  statusLeitura = "",
}: {
  titulo: string;
  capaUrl: string;
  className?: string;
  statusLeitura?: StatusLeitura | string;
}) {
  const marca = corStatus(statusLeitura);
  const label = statusLeitura ? labelStatus(statusLeitura) : "";

  return (
    <div className={cn("relative h-32 w-[5.4rem] shrink-0", className)}>
      {capaUrl.startsWith("https://") ? (
        // Covers come from the catalog the reader chose, on hosts we do not pin in next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={capaUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-md bg-muted object-cover shadow-sm ring-1 ring-foreground/10"
        />
      ) : (
        <ClothCover titulo={titulo} />
      )}
      {marca ? (
        <span
          title={label}
          aria-label={label}
          className="absolute inset-x-0 top-0 z-10 h-2.5 rounded-t-md shadow-sm"
          style={{ background: marca }}
        />
      ) : null}
    </div>
  );
}

function ClothCover({ titulo }: { titulo: string }) {
  const words = titulo.split(/\s+/).filter(Boolean);
  const initials = (words[0]?.[0] ?? "L") + (words[1]?.[0] ?? "");
  let index = 0;
  for (const char of titulo) index = (index + char.charCodeAt(0)) % CLOTHS.length;

  return (
    <div
      aria-hidden
      className="flex h-full w-full items-end rounded-md p-2 text-white shadow-sm"
      style={{ background: CLOTHS[index] }}
    >
      <span className="font-heading text-lg leading-none tracking-wide uppercase">{initials}</span>
    </div>
  );
}
