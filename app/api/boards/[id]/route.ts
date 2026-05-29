import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const store = await getStore();
  const board = await store.boards.get(id);
  if (!board) return bad("board not found", 404);
  const [nodes, edges] = await Promise.all([
    store.nodes.all({ boardId: id }),
    store.edges.all({ boardId: id }),
  ]);
  return ok({ board, nodes, edges });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson<Record<string, string | undefined>>(req);
  if (!body) return bad("invalid body");
  const store = await getStore();
  const allowed = [
    "name",
    "tagline",
    "voice",
    "audience",
    "doctrineName",
    "framework",
    "referenceDoc",
    "notes",
  ] as const;
  const patch: Record<string, string> = { updatedAt: new Date().toISOString() };
  for (const k of allowed) {
    if (typeof body[k] === "string") patch[k] = body[k]!.trim();
  }
  const updated = await store.boards.update(id, patch);
  if (!updated) return bad("board not found", 404);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const store = await getStore();
  const nodes = await store.nodes.all({ boardId: id });
  const edges = await store.edges.all({ boardId: id });
  await Promise.all([
    ...nodes.map((n) => store.nodes.remove(n.id)),
    ...edges.map((e) => store.edges.remove(e.id)),
  ]);
  await store.boards.remove(id);
  return ok({ ok: true });
}
