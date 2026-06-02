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

/** Tiny markdown -> HTML converter for our generation output. Covers the
 *  subset we emit: headings, bold, bullets, blockquotes, hr, paragraphs.
 *  Output is suitable for clipboard "text/html" — Google Docs preserves the
 *  formatting on paste. */
export function markdownToHtml(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, "$1<em>$2</em>");

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let listOpen = false;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push("<p>" + inline(paraBuf.join(" ")) + "</p>");
      paraBuf = [];
    }
  };
  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      closeList();
      continue;
    }
    if (line === "---") {
      flushPara();
      closeList();
      out.push("<hr />");
      continue;
    }
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (line.startsWith("> ")) {
      flushPara();
      closeList();
      out.push("<blockquote>" + inline(line.slice(2)) + "</blockquote>");
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push("<li>" + inline(line.replace(/^[-*]\s+/, "")) + "</li>");
      continue;
    }
    paraBuf.push(line);
  }
  flushPara();
  closeList();
  return `<div style="font-family:Arial,sans-serif;line-height:1.5">${out.join("\n")}</div>`;
}

/** Copies HTML + plain-text markdown to the clipboard and opens a fresh
 *  Google Doc in a new tab. The user pastes (Ctrl/Cmd+V) into the new doc
 *  and Google preserves the HTML formatting. */
export async function exportToGoogleDoc(markdown: string): Promise<boolean> {
  const html = markdownToHtml(markdown);
  try {
    if (typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(markdown);
    }
  } catch {
    return false;
  }
  window.open("https://docs.google.com/document/create", "_blank", "noopener");
  return true;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
