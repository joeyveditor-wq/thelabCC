import { ok, bad } from "@/lib/api";
import { parseDocxBuffer, parsePdfBuffer } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

/** Extract plain text from an uploaded file (PDF/DOCX/TXT) for form-filling.
 *  Unlike /api/upload, this does NOT create a brain source. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("expected multipart/form-data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return bad("file is required");

  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  let text = "";
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      text = await parsePdfBuffer(new Uint8Array(buf));
    } else if (
      name.endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      text = await parseDocxBuffer(buf);
    } else {
      text = buf.toString("utf8");
    }
  } catch (e) {
    return bad("could not parse file: " + (e as Error).message, 422);
  }

  return ok({ title: stripExt(file.name), text: text.trim() });
}
