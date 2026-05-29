import type { BrainSource, NodeKind } from "./types";

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

export interface SourcePayload {
  kind: Exclude<NodeKind, "note" | "output">;
  url?: string;
  title?: string;
  text?: string;
  file?: File;
  boardId?: string;
}

/** Create a brain source from either an uploaded file or pasted text/URL. */
export async function createSource(payload: SourcePayload): Promise<BrainSource> {
  if (payload.file) {
    const fd = new FormData();
    fd.append("file", payload.file);
    fd.append("kind", payload.kind);
    if (payload.title) fd.append("title", payload.title);
    if (payload.boardId) fd.append("boardId", payload.boardId);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json() as Promise<BrainSource>;
  }
  const { file: _file, ...json } = payload;
  void _file;
  return api<BrainSource>("/api/sources", {
    method: "POST",
    body: JSON.stringify(json),
  });
}

/** Extract text from a file (PDF/DOCX/TXT) without creating a brain source. */
export async function parseFile(file: File): Promise<{ title: string; text: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/parse", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ title: string; text: string }>;
}

export function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
