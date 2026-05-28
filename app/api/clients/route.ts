import { nanoid } from "nanoid";
import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import type { ClientProfile } from "@/lib/types";

export async function GET() {
  const store = await getStore();
  const clients = await store.clients.all();
  clients.sort((a, b) => a.name.localeCompare(b.name));
  return ok(clients);
}

export async function POST(req: Request) {
  const body = await readJson<Partial<ClientProfile>>(req);
  if (!body?.name?.trim()) return bad("name is required");
  const store = await getStore();
  const client: ClientProfile = {
    id: nanoid(),
    name: body.name.trim(),
    niche: body.niche ?? "",
    voice: body.voice ?? "",
    audience: body.audience ?? "",
    notes: body.notes,
    referenceDoc: body.referenceDoc,
    createdAt: new Date().toISOString(),
  };
  await store.clients.insert(client);
  return ok(client, 201);
}
