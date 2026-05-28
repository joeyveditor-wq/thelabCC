import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import type { BoardEdge, BoardNode } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Replace the full node/edge graph for a board (canvas autosave). */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson<{ nodes: BoardNode[]; edges: BoardEdge[] }>(req);
  if (!body) return bad("invalid body");

  const store = await getStore();
  const board = await store.boards.get(id);
  if (!board) return bad("board not found", 404);

  const [existingNodes, existingEdges] = await Promise.all([
    store.nodes.all({ boardId: id }),
    store.edges.all({ boardId: id }),
  ]);
  await Promise.all([
    ...existingNodes.map((n) => store.nodes.remove(n.id)),
    ...existingEdges.map((e) => store.edges.remove(e.id)),
  ]);

  await Promise.all([
    ...body.nodes.map((n) => store.nodes.insert({ ...n, boardId: id })),
    ...body.edges.map((e) => store.edges.insert({ ...e, boardId: id })),
  ]);
  await store.boards.update(id, { updatedAt: new Date().toISOString() });

  return ok({ ok: true, nodes: body.nodes.length, edges: body.edges.length });
}
