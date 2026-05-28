"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board, ClientProfile } from "@/lib/types";
import { api } from "@/lib/client";

export function NewBoard({ clients }: { clients: ClientProfile[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const board = await api<Board>("/api/boards", {
        method: "POST",
        body: JSON.stringify({ name, clientId: clientId || undefined }),
      });
      router.push(`/board/${board.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn-chrome" onClick={() => setOpen(true)}>
        + New board
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
              <h2 className="display relative text-2xl text-[var(--text)]">
                New board
              </h2>
            </div>
            <div className="space-y-3 p-5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name — e.g. Q3 Short-Form Sprint"
                className="input"
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="input"
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--line)] p-5">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-chrome disabled:opacity-50" disabled={busy} onClick={create}>
                {busy ? "Creating…" : "Create board"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
