import { nanoid } from "nanoid";
import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import type { Doctrine } from "@/lib/types";

export async function GET(req: Request) {
  const store = await getStore();
  const clientId = new URL(req.url).searchParams.get("clientId") ?? undefined;
  const doctrines = await store.doctrines.all(clientId ? { clientId } : undefined);
  return ok(doctrines);
}

export async function POST(req: Request) {
  const body = await readJson<Partial<Doctrine>>(req);
  if (!body?.name?.trim() || !body?.framework?.trim())
    return bad("name and framework are required");
  const store = await getStore();
  const doctrine: Doctrine = {
    id: nanoid(),
    clientId: body.clientId,
    name: body.name.trim(),
    framework: body.framework.trim(),
    createdAt: new Date().toISOString(),
  };
  await store.doctrines.insert(doctrine);
  return ok(doctrine, 201);
}
