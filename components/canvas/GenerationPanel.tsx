"use client";

import { useState } from "react";
import type {
  Board,
  BoardNode,
  GenerateRequest,
  GenerationResult,
  HistoryEntry,
} from "@/lib/types";
import { parseFile } from "@/lib/client";
import { KIND_META } from "./NodeChrome";

const GOAL_PRESETS = [
  "Viral short-form video concepts",
  "Repurpose into a 5-post carousel series",
  "Punchy caption + hook variations",
  "Campaign angles for a product launch",
];

type Tab = "chat" | "brand" | "history";

export function GenerationPanel({
  open,
  onClose,
  board,
  onBoardChange,
  fedSources,
  allSourceCount,
  fedInstructionCount,
  history,
  onOpenHistory,
  generating,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  board: Board;
  onBoardChange: (patch: Partial<Board>) => void;
  fedSources: BoardNode[];
  allSourceCount: number;
  fedInstructionCount: number;
  history: HistoryEntry[];
  onOpenHistory: (r: GenerationResult) => void;
  generating: boolean;
  onGenerate: (req: Omit<GenerateRequest, "boardId" | "sourceIds">) => void;
}) {
  const [tab, setTab] = useState<Tab>("chat");

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

      <div className="flex border-b border-[var(--line)]">
        {(
          [
            ["chat", "Chat"],
            ["brand", "Brand"],
            ["history", `History${history.length ? " · " + history.length : ""}`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`label flex-1 px-3 py-3 transition-colors ${
              tab === t
                ? "border-b-2 border-cc-magenta text-[var(--text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "chat" && (
          <ChatTab
            fedSources={fedSources}
            allSourceCount={allSourceCount}
            fedInstructionCount={fedInstructionCount}
            generating={generating}
            onGenerate={onGenerate}
          />
        )}
        {tab === "brand" && <BrandTab board={board} onChange={onBoardChange} />}
        {tab === "history" && (
          <HistoryTab history={history} onOpen={onOpenHistory} />
        )}
      </div>
    </aside>
  );
}

/* --------------------------------- chat ---------------------------------- */

function ChatTab({
  fedSources,
  allSourceCount,
  fedInstructionCount,
  generating,
  onGenerate,
}: {
  fedSources: BoardNode[];
  allSourceCount: number;
  fedInstructionCount: number;
  generating: boolean;
  onGenerate: (req: Omit<GenerateRequest, "boardId" | "sourceIds">) => void;
}) {
  const [goal, setGoal] = useState(GOAL_PRESETS[0]);
  const [count, setCount] = useState(4);

  const usingAll = fedSources.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-5 p-5">
        <Field label="What's feeding the AI">
          {usingAll && fedInstructionCount === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-[12px] text-[var(--text-muted)]">
              Using all <span className="text-[var(--text)]">{allSourceCount}</span>{" "}
              sources on the board, no pinned instructions. Hit{" "}
              <span className="text-[var(--text)]">+ FEED</span> on a node to narrow
              the sources or pin a Note as an instruction.
            </p>
          ) : (
            <div className="space-y-1.5">
              {fedInstructionCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-cc-yellow/40 bg-cc-yellow/10 px-2.5 py-1.5">
                  <span className="text-cc-yellow">⌘</span>
                  <span className="truncate text-[12px] text-[var(--text)]">
                    {fedInstructionCount} instruction
                    {fedInstructionCount === 1 ? "" : "s"} pinned
                  </span>
                </div>
              )}
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
                  {s.useFor && (
                    <span
                      title={s.useFor}
                      className="ml-auto text-cc-magenta"
                    >
                      ⌘
                    </span>
                  )}
                </div>
              ))}
              {usingAll && (
                <p className="text-[11px] text-[var(--text-muted)]">
                  + all {allSourceCount} sources (no source pins set).
                </p>
              )}
            </div>
          )}
        </Field>

        <Field label="Goal">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="What do you want the AI to make?"
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
      </div>

      <div className="mt-auto border-t border-[var(--line)] p-5">
        <button
          disabled={generating || !goal.trim()}
          onClick={() => onGenerate({ goal, count })}
          className="btn-chrome w-full !py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating…" : "✦ Generate concepts"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- brand --------------------------------- */

function BrandTab({
  board,
  onChange,
}: {
  board: Board;
  onChange: (patch: Partial<Board>) => void;
}) {
  return (
    <div className="space-y-4 p-5">
      <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
        Everything here gets fed to the AI on every generation. Edit anything —
        it auto-saves.
      </p>

      <EditField
        label="Client name"
        value={board.name}
        onSave={(v) => onChange({ name: v })}
      />
      <EditField
        label="One-liner"
        value={board.tagline || ""}
        placeholder="Niche / what they do"
        onSave={(v) => onChange({ tagline: v })}
      />
      <EditField
        label="Voice"
        value={board.voice || ""}
        placeholder="How they speak — short, punchy, formal, locker-room, etc."
        multiline
        onSave={(v) => onChange({ voice: v })}
      />
      <EditField
        label="Audience"
        value={board.audience || ""}
        placeholder="Who they're talking to"
        onSave={(v) => onChange({ audience: v })}
      />

      <div className="border-t border-[var(--line)] pt-4">
        <EditField
          label="Doctrine / playbook name"
          value={board.doctrineName || ""}
          placeholder='e.g. "Sub-2s Hook Doctrine"'
          onSave={(v) => onChange({ doctrineName: v })}
        />
        <div className="mt-3">
          <EditField
            label="Framework"
            value={board.framework || ""}
            placeholder="The rules every output must follow"
            multiline
            onSave={(v) => onChange({ framework: v })}
          />
        </div>
        <div className="mt-3">
          <BrandPdfUpload
            current={board.referenceDoc}
            onParsed={(text) => onChange({ referenceDoc: text })}
            onClear={() => onChange({ referenceDoc: "" })}
          />
        </div>
      </div>

      <div className="border-t border-[var(--line)] pt-4">
        <EditField
          label="Notes (talent, references, anything else)"
          value={board.notes || ""}
          placeholder="e.g. talent: Coach Reyes, ex-pro sprinter, films mid-set, never reads a script."
          multiline
          onSave={(v) => onChange({ notes: v })}
        />
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onSave,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [val, setVal] = useState(value);
  const dirty = val !== value;
  return (
    <label className="block">
      <span className="label mb-1.5 block text-[var(--text-muted)]">
        {label}
        {dirty && <span className="ml-2 text-cc-magenta">●</span>}
      </span>
      {multiline ? (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => dirty && onSave(val)}
          placeholder={placeholder}
          rows={3}
          className="input resize-none"
        />
      ) : (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => dirty && onSave(val)}
          placeholder={placeholder}
          className="input"
        />
      )}
    </label>
  );
}

function BrandPdfUpload({
  current,
  onParsed,
  onClear,
}: {
  current?: string;
  onParsed: (text: string) => void;
  onClear: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await parseFile(f);
      if (!r.text) setErr("No text found in that file.");
      else onParsed(r.text);
    } catch {
      setErr("Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="label mb-1.5 text-[var(--text-muted)]">Brand / voice doc (PDF)</p>
      {current ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--bg-elevated)] px-3 py-2.5">
          <span className="text-cc-magenta">▤</span>
          <span className="text-[12px] text-[var(--text)]">
            Brand doc attached · ~{Math.round(current.length / 4)} tokens
          </span>
          <button
            onClick={onClear}
            className="ml-auto text-[var(--text-muted)] hover:text-cc-coral"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:border-cc-magenta hover:text-[var(--text)]">
          <span className="text-cc-magenta">⬆</span>
          {busy ? "Extracting…" : "Upload brand PDF"}
          <input
            type="file"
            accept=".pdf,application/pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      {err && <p className="mt-1 text-[11px] text-cc-coral">{err}</p>}
    </div>
  );
}

/* -------------------------------- history -------------------------------- */

function HistoryTab({
  history,
  onOpen,
}: {
  history: HistoryEntry[];
  onOpen: (r: GenerationResult) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-dashed border-[var(--line-strong)] p-8 text-center text-[12px] text-[var(--text-muted)]">
          No generations on this board yet.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 p-5">
      {history.map((h) => (
        <button
          key={h.id}
          onClick={() => onOpen(h)}
          className="group block w-full rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-3 text-left transition-colors hover:border-cc-magenta"
        >
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
            {h.goal}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="label text-[var(--text-muted)]">
              {h.ideas.length} concepts
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {new Date(h.createdAt).toLocaleString()}
            </span>
          </div>
        </button>
      ))}
    </div>
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
