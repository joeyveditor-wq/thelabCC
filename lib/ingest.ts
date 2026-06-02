import type { BrainSource, NodeKind } from "./types";

type IngestKind = Exclude<NodeKind, "note" | "output" | "group">;

export interface IngestInput {
  kind: IngestKind;
  url?: string;
  title?: string;
  /** raw pasted text for documents */
  text?: string;
}

export interface IngestOutput {
  title: string;
  content: string;
  summary: string;
  tokens: number;
  url?: string;
}

/**
 * Ingests a source into searchable text. Real providers (PDF parse, web scrape,
 * YouTube transcript) plug in here; until keys/libs are wired we extract what we
 * can and otherwise return a faithful placeholder so the pipeline runs end-to-end.
 */
export async function ingestSource(input: IngestInput): Promise<IngestOutput> {
  switch (input.kind) {
    case "website":
      return ingestWebsite(input);
    case "youtube":
      return ingestYouTube(input);
    case "document":
      return ingestDocument(input);
    case "pdf":
      return ingestPdf(input);
    case "image":
      return ingestImage(input);
  }
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

export function summarize(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/* ------------------------- uploaded-file parsing -------------------------- */

/** Extract text from an uploaded PDF buffer using unpdf (serverless-friendly). */
export async function parsePdfBuffer(buf: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n\n") : text).trim();
}

/** Extract raw text from an uploaded .docx buffer using mammoth. */
export async function parseDocxBuffer(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value.trim();
}

export function buildIngestOutput(
  title: string,
  content: string,
  url?: string
): IngestOutput {
  const clean = content.trim() || "[No extractable text found]";
  return {
    title,
    url,
    content: clean.slice(0, 20000),
    summary: summarize(clean),
    tokens: estimateTokens(clean.slice(0, 20000)),
  };
}

async function ingestWebsite(input: IngestInput): Promise<IngestOutput> {
  const url = input.url ?? "";
  // Best-effort fetch + strip tags. Network/CORS failures fall back gracefully.
  try {
    const res = await fetch(url, { headers: { "user-agent": "IdeaLabBot/1.0" } });
    const html = await res.text();
    const text = stripHtml(html);
    if (text.length > 40) {
      const title = extractTitle(html) || hostOf(url);
      return {
        title,
        url,
        content: text.slice(0, 8000),
        summary: summarize(text),
        tokens: estimateTokens(text.slice(0, 8000)),
      };
    }
  } catch {
    /* fall through to placeholder */
  }
  const content = `[Web source queued for extraction] ${url}. Main article text will be scraped and indexed here once a scraping provider is configured.`;
  return { title: input.title || hostOf(url), url, content, summary: summarize(content), tokens: estimateTokens(content) };
}

async function ingestYouTube(input: IngestInput): Promise<IngestOutput> {
  const url = input.url ?? "";
  const id = youTubeId(url);

  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const segments = await YoutubeTranscript.fetchTranscript(id || url);
    const transcript = segments
      .map((s) => decodeEntities(s.text))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (transcript.length > 20) {
      return {
        title: input.title || `YouTube — ${id || "video"}`,
        url,
        content: transcript.slice(0, 20000),
        summary: summarize(transcript),
        tokens: estimateTokens(transcript.slice(0, 20000)),
      };
    }
  } catch {
    /* transcript disabled, region-locked, or unavailable — fall through */
  }

  const content = `[No transcript available for ${id || url}] This video has captions disabled or unavailable. Paste key quotes into a note to ground generation on its content.`;
  return {
    title: input.title || `YouTube — ${id || "video"}`,
    url,
    content,
    summary: "YouTube — no transcript available.",
    tokens: estimateTokens(content),
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;|&#39;/g, "'")
    .replace(/&amp;quot;|&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function ingestDocument(input: IngestInput): IngestOutput {
  const text = (input.text || "").trim();
  const content = text || "[Empty document]";
  return {
    title: input.title || "Pasted document",
    content,
    summary: summarize(content),
    tokens: estimateTokens(content),
  };
}

function ingestPdf(input: IngestInput): IngestOutput {
  const content =
    input.text?.trim() ||
    `[PDF queued for extraction] ${input.title || "document.pdf"}. Page text will be parsed and indexed here once a PDF parser is configured.`;
  return {
    title: input.title || "document.pdf",
    content,
    summary: summarize(content),
    tokens: estimateTokens(content),
  };
}

function ingestImage(input: IngestInput): IngestOutput {
  const content = `[Image] ${input.title || input.url || "image"}. Used as visual reference / mood on the canvas.`;
  return {
    title: input.title || "Image",
    url: input.url,
    content,
    summary: "Visual reference.",
    tokens: 0,
  };
}

/* helpers */

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "Website";
  }
}

export function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
