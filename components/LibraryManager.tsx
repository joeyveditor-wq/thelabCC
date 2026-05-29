"use client";

import { useState } from "react";
import type { BrainSource, NodeKind } from "@/lib/types";
import { api, createSource } from "@/lib/client";
import { KIND_META } from "@/components/canvas/NodeChrome";
import { AddSourceModal, type AddPayload } from "@/components/canvas/AddSourceModal";

type SourceKind = Exclude<NodeKind, "note" | "output">;
const KINDS: SourceKind[] = ["pdf", "document", "website", "youtube", "image"];

export function LibraryManager({
  initialSources,
}: {
  initialSources: BrainSource[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [adding, setAdding] = useState<SourceKind | null>(null);

  const add = async (p: AddPayload) => {
    const src = await createSource(p);
    setSources((prev) => [src, ...prev]);
    setAdding(null);
  };

  const remove = async (id: string) => {
    await api(`/api/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="label text-[var(--text-muted)]">
          Sources you ingest on any client's board show up here too. Anything you
          add from this page isn't attached to a client until you drop it on a board.
        </p>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setAdding(k)}
              className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:border-cc-magenta hover:text-[var(--text)]"
            >
              <span style={{ color: KIND_META[k].accent }}>+ {KIND_META[k].glyph}</span>
              {KIND_META[k].label}
            </button>
          ))}
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--line-strong)] p-16 text-center text-[var(--text-muted)]">
          No sources yet — add a PDF, link, video, or doc to build your brain.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s, i) => {
            const meta = KIND_META[s.kind];
            return (
              <article
                key={s.id}
                className="group animate-rise-in relative overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-raised)] p-4"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-md text-[12px]"
                    style={{ background: `${meta.accent}22`, color: meta.accent }}
                  >
                    {meta.glyph}
                  </span>
                  <span className="label" style={{ color: meta.accent }}>
                    {meta.label}
                  </span>
                  <button
                    onClick={() => remove(s.id)}
                    className="ml-auto text-[var(--text-muted)] opacity-0 transition-opacity hover:text-cc-coral group-hover:opacity-100"
                    title="Delete source"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="mb-1 line-clamp-2 font-semibold leading-snug text-[var(--text)]">
                  {s.title}
                </h3>
                <p className="line-clamp-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
                  {s.summary || s.content}
                </p>
                {s.tokens ? (
                  <div className="mt-3 border-t border-[var(--line)] pt-2.5">
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      ~{s.tokens} tokens
                    </span>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {adding && (
        <AddSourceModal kind={adding} onClose={() => setAdding(null)} onSubmit={add} />
      )}
    </div>
  );
}
