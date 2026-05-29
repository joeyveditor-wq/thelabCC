"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "@/lib/types";
import { api } from "@/lib/client";

export function BoardCard({
  board,
  sourceCount,
  nodeCount,
  index,
}: {
  board: Board;
  sourceCount: number;
  nodeCount: number;
  index: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete "${board.name}" — and everything on its board (nodes, edges, history)? This can't be undone.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api(`/api/boards/${board.id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setBusy(false);
      alert("Couldn't delete that client. Try again.");
    }
  };

  return (
    <div
      className="group animate-rise-in relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--bg-raised)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-glow"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link
        href={`/board/${board.id}`}
        className="block p-5"
        aria-disabled={busy}
      >
        <div className="surface-grid-fine pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="mb-6 flex items-center justify-between">
            <span className="label text-cc-magenta">CLIENT</span>
            <span className="label text-[var(--text-muted)]">
              {sourceCount} src · {nodeCount} nodes
            </span>
          </div>
          <h3 className="display pr-8 text-2xl leading-tight text-[var(--text)] transition-colors group-hover:text-chrome">
            {board.name}
          </h3>
          {board.tagline && (
            <p className="mt-1 line-clamp-2 text-[13px] text-[var(--text-dim)]">
              {board.tagline}
            </p>
          )}
          <p className="mt-3 font-mono text-[11px] text-[var(--text-muted)]">
            Updated {new Date(board.updatedAt).toLocaleDateString()}
          </p>
          <div className="chrome-rule mt-5 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </Link>

      <button
        onClick={onDelete}
        disabled={busy}
        title="Delete client"
        aria-label={`Delete client ${board.name}`}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--bg)]/80 text-[var(--text-muted)] backdrop-blur transition-colors hover:border-cc-coral hover:bg-cc-coral hover:text-black disabled:opacity-50"
      >
        {busy ? "…" : "🗑"}
      </button>
    </div>
  );
}
