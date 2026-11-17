"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { STATUS_META, labelStatus } from "@/lib/metas";
import type { Livro, StatusLeitura } from "@/lib/types";
import { cn } from "cn";

export function StatusMetaChips({
  livroId,
  statusLeitura,
  onChange,
  className,
}: {
  livroId: string;
  statusLeitura: StatusLeitura | string;
  onChange?: (status: StatusLeitura) => void;
  className?: string;
}) {
  const [current, setCurrent] = useState(statusLeitura);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setCurrent(statusLeitura);
  }, [statusLeitura]);

  async function escolher(status: Exclude<StatusLeitura, "">) {
    if (updating) return;
    const next: StatusLeitura = current === status ? "" : status;
    setUpdating(true);
    try {
      const payload = await api<{ livro: Livro }>(`/api/livros/${livroId}`, {
        method: "PATCH",
        body: JSON.stringify({ statusLeitura: next }),
      });
      setCurrent(payload.livro.statusLeitura);
      onChange?.(payload.livro.statusLeitura);
      toast.success(
        next ? `Marcado como ${labelStatus(next)}.` : "Removido das metas.",
      );
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível atualizar a meta.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Meta de leitura"
    >
      {STATUS_META.map((item) => {
        const active = current === item.id;
        return (
          <button
            key={item.id}
            type="button"
            disabled={updating}
            onClick={() => escolher(item.id)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
              active
                ? "text-white shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-accent",
            )}
            style={active ? { background: item.cor } : undefined}
            aria-pressed={active}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: active ? "currentColor" : item.cor }}
              aria-hidden
            />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
