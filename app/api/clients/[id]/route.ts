import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import type { ClientProfile } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson<Partial<ClientProfile>>(req);
  if (!body) return bad("invalid body");
  const store = await getStore();
  const updated = await store.clients.update(id, body);
  if (!updated) return bad("client not found", 404);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const store = await getStore();
  await store.clients.remove(id);
  return ok({ ok: true });
}
