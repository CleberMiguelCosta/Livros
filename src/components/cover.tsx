import { cn } from "cn";

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
}: {
  titulo: string;
  capaUrl: string;
  className?: string;
}) {
  if (capaUrl.startsWith("https://")) {
    return (
      // Covers come from the catalog the reader chose, on hosts we do not pin in next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={capaUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(
          "h-32 w-[5.4rem] shrink-0 rounded-md bg-muted object-cover shadow-sm ring-1 ring-foreground/10",
          className,
        )}
      />
    );
  }

  const words = titulo.split(/\s+/).filter(Boolean);
  const initials = (words[0]?.[0] ?? "L") + (words[1]?.[0] ?? "");
  let index = 0;
  for (const char of titulo) index = (index + char.charCodeAt(0)) % CLOTHS.length;

  return (
    <div
      aria-hidden
      className={cn(
        "flex h-32 w-[5.4rem] shrink-0 items-end rounded-md p-2 text-white shadow-sm",
        className,
      )}
      style={{ background: CLOTHS[index] }}
    >
      <span className="font-heading text-lg leading-none tracking-wide uppercase">{initials}</span>
    </div>
  );
}
