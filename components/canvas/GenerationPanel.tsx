"use client";

import { useState } from "react";
import type {
  BoardNode,
  ClientProfile,
  Doctrine,
  GenerateRequest,
  TalentProfile,
} from "@/lib/types";
import { KIND_META } from "./NodeChrome";

const GOAL_PRESETS = [
  "Viral short-form video concepts",
  "Repurpose into a 5-post carousel series",
  "Punchy caption + hook variations",
  "Campaign angles for a product launch",
];

export function GenerationPanel({
  open,
  onClose,
  fedSources,
  allSourceCount,
  clients,
  talent,
  doctrines,
  defaultClientId,
  generating,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  fedSources: BoardNode[];
  allSourceCount: number;
  clients: ClientProfile[];
  talent: TalentProfile[];
  doctrines: Doctrine[];
  defaultClientId?: string;
  generating: boolean;
  onGenerate: (req: Omit<GenerateRequest, "boardId" | "sourceIds">) => void;
}) {
  const [goal, setGoal] = useState(GOAL_PRESETS[0]);
  const [count, setCount] = useState(4);
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [talentId, setTalentId] = useState("");
  const [doctrineId, setDoctrineId] = useState("");

  const usingAll = fedSources.length === 0;

  return (
    <aside
      className={`fixed right-0 top-16 z-30 flex h-[calc(100vh-4rem)] w-[380px] flex-col border-l border-[var(--line)] bg-[var(--bg-raised)] transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ boxShadow: open ? "-30px 0 60px -30px rgba(0,0,0,0.8)" : undefined }}
    >
      <div className="relative flex items-center gap-3 overflow-hidden border-b border-[var(--line)] p-5">
        <div className="bloom absolute inset-0" />
        <div className="relative">
          <p className="label mb-1 text-cc-magenta">Generation Engine</p>
          <h2 className="display text-2xl text-[var(--text)]">Cook an idea</h2>
        </div>
        <button onClick={onClose} className="btn-ghost relative ml-auto !px-3 !py-2">
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <Field label="Goal">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className="input resize-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {GOAL_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setGoal(p)}
                className="rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:border-cc-magenta hover:text-[var(--text)]"
              >
                {p}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Brain (${usingAll ? `all ${allSourceCount} on board` : `${fedSources.length} fed`})`}>
          {usingAll ? (
            <p className="rounded-xl border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-[12px] text-[var(--text-muted)]">
              No nodes selected — generation will use every source on the board.
              Hit <span className="text-[var(--text)]">+ FEED</span> on nodes to
              narrow it.
            </p>
          ) : (
            <div className="space-y-1.5">
              {fedSources.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-2.5 py-1.5"
                >
                  <span style={{ color: KIND_META[s.kind].accent }}>
                    {KIND_META[s.kind].glyph}
                  </span>
                  <span className="truncate text-[12px] text-[var(--text)]">
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Field>

        <Field label="Concepts">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={6}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 accent-cc-magenta"
            />
            <span className="display w-8 text-center text-xl text-chrome">{count}</span>
          </div>
        </Field>

        <Select
          label="Client voice"
          value={clientId}
          onChange={setClientId}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          empty="No client (neutral)"
        />
        <Select
          label="Talent"
          value={talentId}
          onChange={setTalentId}
          options={talent.map((t) => ({ value: t.id, label: t.name }))}
          empty="No talent"
        />
        <Select
          label="Doctrine / framework"
          value={doctrineId}
          onChange={setDoctrineId}
          options={doctrines.map((d) => ({ value: d.id, label: d.name }))}
          empty="No doctrine"
        />
      </div>

      <div className="border-t border-[var(--line)] p-5">
        <button
          disabled={generating || !goal.trim()}
          onClick={() =>
            onGenerate({
              goal,
              count,
              clientId: clientId || undefined,
              talentId: talentId || undefined,
              doctrineId: doctrineId || undefined,
            })
          }
          className="btn-chrome w-full !py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating…" : "✦ Generate concepts"}
        </button>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label mb-1.5 text-[var(--text-muted)]">{label}</p>
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  empty,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  empty: string;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
