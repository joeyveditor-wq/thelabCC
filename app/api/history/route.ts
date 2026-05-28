import { getStore } from "@/lib/store";
import { ok } from "@/lib/api";

export async function GET(req: Request) {
  const store = await getStore();
  const boardId = new URL(req.url).searchParams.get("boardId") ?? undefined;
  const entries = await store.history.all(boardId ? { boardId } : undefined);
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok(entries);
}
