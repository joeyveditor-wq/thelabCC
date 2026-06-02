"use client";

import { useRef, useState } from "react";
import type { NodeKind } from "@/lib/types";
import { KIND_META } from "./NodeChrome";

export interface AddPayload {
  kind: Exclude<NodeKind, "note" | "output" | "group">;
  url?: string;
  title?: string;
  text?: string;
  /** One or more files when the user uploads. Empty array = no file. */
  files?: File[];
  /** Optional per-source instruction for Claude (applied to every file in the batch). */
  useFor?: string;
}

interface KindCopy {
  title: string;
  hint: string;
  url?: boolean;
  text?: boolean;
  file?: string; // accept attribute; undefined = no upload
}

const COPY: Record<string, KindCopy> = {
  website: { title: "Add a website", hint: "Paste a URL — we scrape and index the main content.", url: true },
  youtube: { title: "Add a YouTube video", hint: "Paste the video URL — we pull the transcript.", url: true },
  pdf: { title: "Add a PDF", hint: "Upload a .pdf, or paste extracted text.", file: ".pdf,application/pdf", text: true },
  document: {
    title: "Add a document",
    hint: "Upload a .txt, .md, or .docx — or paste text.",
    file: ".txt,.md,.markdown,.doc,.docx,text/plain",
    text: true,
  },
  image: { title: "Add an image", hint: "Upload an image, or paste an image URL.", file: "image/*", url: true },
};

export function AddSourceModal({
  kind,
  onClose,
  onSubmit,
}: {
  kind: Exclude<NodeKind, "note" | "output" | "group">;
  onClose: () => void;
  onSubmit: (p: AddPayload) => Promise<void>;
}) {
  const meta = KIND_META[kind];
  const copy = COPY[kind];
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [useFor, setUseFor] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const multi = files.length > 1;

  const valid =
    files.length > 0 ||
    (copy.url ? url.trim().length > 4 : false) ||
    (copy.text ? text.trim().length > 2 : false);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onSubmit({
        kind,
        url: url.trim() || undefined,
        title: !multi && title.trim() ? title.trim() : undefined,
        text: text.trim() || undefined,
        files: files.length > 0 ? files : undefined,
        useFor: useFor.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const pickFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    setFiles(incoming);
    if (incoming.length === 1 && !title.trim()) {
      setTitle(incoming[0].name.replace(/\.[^.]+$/, ""));
    } else if (incoming.length > 1) {
      setTitle(""); // titles per-file derive from filename on server
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--bg-raised)] shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bloom relative flex items-center gap-3 border-b border-[var(--line)] p-5">
          <span
            className="relative grid h-9 w-9 place-items-center rounded-xl text-lg"
            style={{ background: `${meta.accent}22`, color: meta.accent }}
          >
            {meta.glyph}
          </span>
          <div className="relative">
            <h2 className="display text-xl text-[var(--text)]">{copy.title}</h2>
            <p className="text-[12px] text-[var(--text-muted)]">{copy.hint}</p>
          </div>
        </div>

        <div className="space-y-3 p-5">
          {copy.file && (
            <>
              <DropZone
                accent={meta.accent}
                accept={copy.file}
                files={files}
                onPick={pickFiles}
                onClear={() => {
                  setFiles([]);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                inputRef={fileInput}
                isImage={kind === "image"}
              />
              {(copy.text || copy.url) && files.length === 0 && (
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-[var(--line)]" />
                  <span className="label text-[var(--text-muted)]">or</span>
                  <span className="h-px flex-1 bg-[var(--line)]" />
                </div>
              )}
            </>
          )}

          {files.length === 0 && copy.url && (
            <input
              autoFocus={!copy.file}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                kind === "youtube"
                  ? "https://youtube.com/watch?v=…"
                  : kind === "image"
                    ? "https://…/image.jpg"
                    : "https://…"
              }
              className="input"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          )}

          {files.length === 0 && copy.text && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="…or paste content to index"
              className="input resize-none"
            />
          )}

          {!multi && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="input"
            />
          )}

          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-3">
            <p className="label mb-1.5 flex items-center gap-2 text-[var(--text-muted)]">
              <span className="text-cc-magenta">⌘</span>
              Tell the lab how to use this (optional)
            </p>
            <textarea
              value={useFor}
              onChange={(e) => setUseFor(e.target.value)}
              rows={2}
              placeholder={
                kind === "image"
                  ? "e.g. aesthetic / mood reference only — match lighting + color, ignore the subject"
                  : kind === "youtube"
                    ? "e.g. mine the hooks and pacing; ignore the niche"
                    : kind === "pdf" || kind === "document"
                      ? "e.g. cross-reference only, not a strict guideline"
                      : "e.g. use as one supporting data point"
              }
              className="w-full resize-none rounded-lg border border-[var(--line-strong)] bg-[var(--bg-raised)] px-2.5 py-2 text-[12px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-cc-magenta"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] p-5">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={submit} disabled={!valid || busy} className="btn-chrome disabled:opacity-50">
            {busy
              ? files.length > 1
                ? `Indexing ${files.length} files…`
                : "Indexing…"
              : files.length > 1
                ? `Add ${files.length} to canvas`
                : "Add to canvas"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DropZone({
  accent,
  accept,
  files,
  onPick,
  onClear,
  inputRef,
  isImage,
}: {
  accent: string;
  accept: string;
  files: File[];
  onPick: (files: File[]) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isImage: boolean;
}) {
  const [drag, setDrag] = useState(false);

  if (files.length === 1) {
    const file = files[0];
    return (
      <div
        className="flex items-center gap-3 rounded-xl border px-3 py-3"
        style={{ borderColor: accent }}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={URL.createObjectURL(file)}
            alt=""
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <span
            className="grid h-12 w-12 place-items-center rounded-lg text-lg"
            style={{ background: `${accent}22`, color: accent }}
          >
            ▤
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[var(--text)]">
            {file.name}
          </p>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">
            {(file.size / 1024).toFixed(0)} KB · ready to index
          </p>
        </div>
        <button
          onClick={onClear}
          className="rounded-md px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text)]"
          title="Remove file"
        >
          ✕
        </button>
      </div>
    );
  }

  if (files.length > 1) {
    const totalKB = files.reduce((a, f) => a + f.size, 0) / 1024;
    return (
      <div
        className="rounded-xl border px-3 py-3"
        style={{ borderColor: accent }}
      >
        <div className="mb-2 flex items-center gap-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg text-base"
            style={{ background: `${accent}22`, color: accent }}
          >
            ▤▤
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--text)]">
              {files.length} files selected
            </p>
            <p className="font-mono text-[11px] text-[var(--text-muted)]">
              {totalKB.toFixed(0)} KB total · each becomes its own node
            </p>
          </div>
          <button
            onClick={onClear}
            className="rounded-md px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Clear all"
          >
            ✕
          </button>
        </div>
        <ul className="max-h-32 space-y-0.5 overflow-y-auto rounded-lg bg-[var(--bg-raised)] p-1.5">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 truncate px-1.5 py-1 text-[11px] text-[var(--text-dim)]"
            >
              <span style={{ color: accent }}>•</span>
              <span className="truncate">{f.name}</span>
              <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">
                {(f.size / 1024).toFixed(0)} KB
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const dropped = Array.from(e.dataTransfer.files ?? []);
        if (dropped.length) onPick(dropped);
      }}
      className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-7 text-center transition-colors"
      style={{
        borderColor: drag ? accent : "var(--line-strong)",
        background: drag ? `${accent}11` : "transparent",
      }}
    >
      <span className="text-2xl" style={{ color: accent }}>
        ⬆
      </span>
      <span className="text-[13px] font-semibold text-[var(--text)]">
        Drop files or click to browse
      </span>
      <span className="text-[11px] text-[var(--text-muted)]">
        Pick one or several — Shift+click to multi-select
      </span>
      <span className="font-mono text-[10px] text-[var(--text-muted)]">{accept}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          if (picked.length) onPick(picked);
        }}
      />
    </label>
  );
}
