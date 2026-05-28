import { nanoid } from "nanoid";
import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import { ingestSource, type IngestInput } from "@/lib/ingest";
import type { BrainSource } from "@/lib/types";

export async function GET(req: Request) {
  const store = await getStore();
  const clientId = new URL(req.url).searchParams.get("clientId") ?? undefined;
  const sources = await store.sources.all(clientId ? { clientId } : undefined);
  sources.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok(sources);
}

export async function POST(req: Request) {
  const body = await readJson<IngestInput & { clientId?: string }>(req);
  if (!body?.kind) return bad("kind is required");

  const ingested = await ingestSource(body);
  const store = await getStore();
  const source: BrainSource = {
    id: nanoid(),
    kind: body.kind,
    title: ingested.title,
    url: ingested.url,
    content: ingested.content,
    summary: ingested.summary,
    tokens: ingested.tokens,
    clientId: body.clientId,
    createdAt: new Date().toISOString(),
  };
  await store.sources.insert(source);
  return ok(source, 201);
}
