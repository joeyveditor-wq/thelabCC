"use client";

import { useRef, useState } from "react";
import type { NodeKind } from "@/lib/types";
import { KIND_META } from "./NodeChrome";

export interface AddPayload {
  kind: Exclude<NodeKind, "note" | "output">;
  url?: string;
  title?: string;
  text?: string;
  file?: File;
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
  kind: Exclude<NodeKind, "note" | "output">;
  onClose: () => void;
  onSubmit: (p: AddPayload) => Promise<void>;
}) {
  const meta = KIND_META[kind];
  const copy = COPY[kind];
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const valid =
    !!file ||
    (copy.url ? url.trim().length > 4 : false) ||
    (copy.text ? text.trim().length > 2 : false);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onSubmit({
        kind,
        url: url.trim() || undefined,
        title: title.trim() || undefined,
        text: text.trim() || undefined,
        file: file || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
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
                file={file}
                onPick={pickFile}
                onClear={() => {
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                inputRef={fileInput}
                isImage={kind === "image"}
              />
              {(copy.text || copy.url) && !file && (
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-[var(--line)]" />
                  <span className="label text-[var(--text-muted)]">or</span>
                  <span className="h-px flex-1 bg-[var(--line)]" />
                </div>
              )}
            </>
          )}

          {!file && copy.url && (
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

          {!file && copy.text && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="…or paste content to index"
              className="input resize-none"
            />
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="input"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] p-5">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={submit} disabled={!valid || busy} className="btn-chrome disabled:opacity-50">
            {busy ? "Indexing…" : "Add to canvas"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DropZone({
  accent,
  accept,
  file,
  onPick,
  onClear,
  inputRef,
  isImage,
}: {
  accent: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isImage: boolean;
}) {
  const [drag, setDrag] = useState(false);

  if (file) {
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
          <p className="truncate text-[13px] font-semibold text-[var(--text)]">{file.name}</p>
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
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
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
        Drop a file or click to browse
      </span>
      <span className="font-mono text-[10px] text-[var(--text-muted)]">{accept}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
