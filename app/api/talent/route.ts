import { nanoid } from "nanoid";
import { getStore } from "@/lib/store";
import { ok, bad, readJson } from "@/lib/api";
import type { TalentProfile } from "@/lib/types";

export async function GET(req: Request) {
  const store = await getStore();
  const clientId = new URL(req.url).searchParams.get("clientId") ?? undefined;
  const talent = await store.talent.all(clientId ? { clientId } : undefined);
  return ok(talent);
}

export async function POST(req: Request) {
  const body = await readJson<Partial<TalentProfile>>(req);
  if (!body?.name?.trim()) return bad("name is required");
  const store = await getStore();
  const talent: TalentProfile = {
    id: nanoid(),
    clientId: body.clientId,
    name: body.name.trim(),
    persona: body.persona ?? "",
    delivery: body.delivery ?? "",
    doNots: body.doNots,
    createdAt: new Date().toISOString(),
  };
  await store.talent.insert(talent);
  return ok(talent, 201);
}
