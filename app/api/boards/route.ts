import { nanoid } from "nanoid";
import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import type { Board } from "@/lib/types";

export async function GET() {
  const store = await getStore();
  const boards = await store.boards.all();
  boards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return ok(boards);
}

export async function POST(req: Request) {
  const body = await readJson<Partial<Board>>(req);
  if (!body?.name?.trim()) return bad("name is required");
  const store = await getStore();
  const now = new Date().toISOString();
  const board: Board = {
    id: nanoid(),
    name: body.name.trim(),
    tagline: body.tagline,
    voice: body.voice,
    audience: body.audience,
    doctrineName: body.doctrineName,
    framework: body.framework,
    referenceDoc: body.referenceDoc,
    notes: body.notes,
    createdAt: now,
    updatedAt: now,
  };
  await store.boards.insert(board);
  return ok(board, 201);
}
