export const STATUS_LEITURA = ["quero_ler", "lendo", "lido"] as const;

export type StatusLeitura = (typeof STATUS_LEITURA)[number];

export type StatusLeituraFiltro = StatusLeitura | "todos" | "sem_meta";

export const STATUS_META = [
  {
    id: "quero_ler" as const,
    label: "Quero ler",
    cor: "oklch(0.55 0.12 250)",
    descricao: "Na fila de leitura",
  },
  {
    id: "lendo" as const,
    label: "Lendo",
    cor: "oklch(0.62 0.14 70)",
    descricao: "Em andamento",
  },
  {
    id: "lido" as const,
    label: "Lido",
    cor: "oklch(0.52 0.12 150)",
    descricao: "Concluído",
  },
] as const;

export function isStatusLeitura(value: unknown): value is StatusLeitura {
  return value === "quero_ler" || value === "lendo" || value === "lido";
}

export function labelStatus(status: string) {
  return STATUS_META.find((item) => item.id === status)?.label ?? "Sem meta";
}

export function corStatus(status: string) {
  return STATUS_META.find((item) => item.id === status)?.cor ?? "";
}
