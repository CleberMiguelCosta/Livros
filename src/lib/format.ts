export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function consultaLimpa(value: string, max = 120) {
  return value
    .replace(/[^\p{L}\p{N}\s.'’:-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
