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

  const [client, talent, doctrine] = await Promise.all([
    body.clientId ? store.clients.get(body.clientId) : null,
    body.talentId ? store.talent.get(body.talentId) : null,
    body.doctrineId ? store.doctrines.get(body.doctrineId) : null,
  ]);

  const result = await generateIdeas({
    goal: body.goal.trim(),
    sources,
    client,
    talent,
    doctrine,
    count: body.count ?? 4,
  });

  if (body.boardId) {
    const entry: HistoryEntry = { ...result, boardId: body.boardId };
    await store.history.insert(entry);
  }

  return ok(result, 201);
}
