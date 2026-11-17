export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const response = await fetch(input, {
    ...init,
    headers: {
      accept: "application/json",
      ...(method === "GET" ? {} : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "A estante não reconheceu quem está abrindo. No seu computador o cadastro abre direto; na versão publicada, escolha o acesso privado."
        : "Não foi possível concluir agora.";
    throw new ApiError(typeof body.error === "string" ? body.error : fallback, response.status);
  }
  return body as T;
}
