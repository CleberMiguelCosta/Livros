import { requireIdentity, type VerifiedIdentity } from "../../cursor/identity";

export async function requireOwner(
  request: Request,
): Promise<{ ownerId: string; identity: VerifiedIdentity } | Response> {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  return { ownerId: `${identity.stage}:${identity.sub}`, identity };
}

const hits = new Map<string, number[]>();

export function tooMany(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [name, times] of hits) {
      if (times.every((at) => now - at >= windowMs)) hits.delete(name);
    }
  }
  return false;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export function acceptsJson(request: Request) {
  return (request.headers.get("content-type") ?? "").includes("application/json");
}
