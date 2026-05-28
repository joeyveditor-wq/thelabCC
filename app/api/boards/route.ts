import { nanoid } from "nanoid";
import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import type { Board } from "@/lib/types";

export async function GET(req: Request) {
  const store = await getStore();
  const clientId = new URL(req.url).searchParams.get("clientId") ?? undefined;
  const boards = await store.boards.all(clientId ? { clientId } : undefined);
  boards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return ok(boards);
}

export async function POST(req: Request) {
  const body = await readJson<{ name?: string; clientId?: string }>(req);
  if (!body?.name?.trim()) return bad("name is required");
  const store = await getStore();
  const now = new Date().toISOString();
  const board: Board = {
    id: nanoid(),
    name: body.name.trim(),
    clientId: body.clientId,
    createdAt: now,
    updatedAt: now,
  };
  await store.boards.insert(board);
  return ok(board, 201);
}
