"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "@/lib/types";
import { api } from "@/lib/client";

export function NewClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const board = await api<Board>("/api/boards", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), tagline: tagline.trim() || undefined }),
      });
      router.push(`/board/${board.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn-chrome" onClick={() => setOpen(true)}>
        + New client
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--bg-raised)] shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bloom relative border-b border-[var(--line)] p-5">
              <p className="label relative mb-1 text-cc-magenta">New client workspace</p>
              <h2 className="display relative text-2xl text-[var(--text)]">
                Spin one up
              </h2>
              <p className="relative mt-1 text-[12px] text-[var(--text-muted)]">
                Just a name to start — you'll fill in voice, audience and doctrine on
                the board itself.
              </p>
            </div>
            <div className="space-y-3 p-5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Client name — e.g. APEX ATHLETICS"
                className="input"
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="One-liner (optional) — e.g. Sports performance & training apparel"
                className="input"
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--line)] p-5">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-chrome disabled:opacity-50"
                disabled={busy || !name.trim()}
                onClick={create}
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// keep the old export name for back-compat with any imports
export { NewClient as NewBoard };
