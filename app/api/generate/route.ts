import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import { generateIdeas } from "@/lib/claude";
import type { GenerateRequest, HistoryEntry } from "@/lib/types";

export async function POST(req: Request) {
  const body = await readJson<GenerateRequest>(req);
  if (!body?.goal?.trim()) return bad("goal is required");

  const store = await getStore();
  const sources = (
    await Promise.all((body.sourceIds ?? []).map((id) => store.sources.get(id)))
  ).filter((s): s is NonNullable<typeof s> => !!s);

  const board = body.boardId ? await store.boards.get(body.boardId) : null;

  const result = await generateIdeas({
    goal: body.goal.trim(),
    sources,
    board,
    count: body.count ?? 4,
    instructions: body.instructions,
    sourceContext: body.sourceContext,
  });

  if (body.boardId) {
    const entry: HistoryEntry = { ...result, boardId: body.boardId };
    await store.history.insert(entry);
  }

  return ok(result, 201);
}
