import { promises as fs } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { getStore } from "@/lib/store";
import { ok, bad } from "@/lib/api";
import {
  buildIngestOutput,
  parseDocxBuffer,
  parsePdfBuffer,
} from "@/lib/ingest";
import type { BrainSource, NodeKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadKind = Extract<NodeKind, "pdf" | "document" | "image">;

const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("expected multipart/form-data");
  }

  const file = form.get("file");
  const kind = String(form.get("kind") || "") as UploadKind;
  const titleField = (form.get("title") as string) || "";
  const boardId = (form.get("boardId") as string) || undefined;

  if (!(file instanceof File)) return bad("file is required");
  if (!["pdf", "document", "image"].includes(kind))
    return bad("kind must be pdf, document, or image");

  const buf = Buffer.from(await file.arrayBuffer());
  const baseTitle = titleField.trim() || stripExt(file.name) || "Upload";

  let output;
  if (kind === "image") {
    output = await saveImage(file, buf, baseTitle);
  } else if (kind === "pdf") {
    const text = await parsePdfBuffer(new Uint8Array(buf));
    output = buildIngestOutput(baseTitle, text);
  } else {
    // document: docx via mammoth, otherwise treat as plain text
    const isDocx =
      file.name.toLowerCase().endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const text = isDocx ? await parseDocxBuffer(buf) : buf.toString("utf8");
    output = buildIngestOutput(baseTitle, text);
  }

  const store = await getStore();
  const source: BrainSource = {
    id: nanoid(),
    kind,
    title: output.title,
    url: output.url,
    content: output.content,
    summary: output.summary,
    tokens: output.tokens,
    boardId,
    createdAt: new Date().toISOString(),
  };
  await store.sources.insert(source);
  return ok(source, 201);
}

async function saveImage(file: File, buf: Buffer, title: string) {
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".png").toLowerCase();
  let url: string;

  // Try writing to disk (works in local/dev). On read-only filesystems
  // (e.g. Vercel) this throws, so fall back to an inline data URL.
  try {
    if (process.env.VERCEL) throw new Error("serverless: use data url");
    const fileName = `${nanoid()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buf);
    url = `/uploads/${fileName}`;
  } catch {
    const mime = file.type || "image/png";
    url = `data:${mime};base64,${buf.toString("base64")}`;
  }

  return {
    title,
    url,
    content: `[Image] ${title}. Visual reference / mood on the canvas.`,
    summary: "Uploaded image — visual reference.",
    tokens: 0,
  };
}
