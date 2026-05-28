import { getStore } from "@/lib/store";
import { ok, bad } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const store = await getStore();
  const source = await store.sources.get(id);
  if (!source) return bad("source not found", 404);
  return ok(source);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const store = await getStore();
  await store.sources.remove(id);
  return ok({ ok: true });
}
