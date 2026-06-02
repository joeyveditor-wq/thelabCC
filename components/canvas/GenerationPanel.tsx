"use client";

import { useEffect, useRef, useState } from "react";
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
  mentionables,
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
  mentionables: { kind: "group" | "source"; label: string }[];
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
            mentionables={mentionables}
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
  mentionables,
  generating,
  onGenerate,
}: {
  fedSources: BoardNode[];
  allSourceCount: number;
  fedInstructionCount: number;
  mentionables: { kind: "group" | "source"; label: string }[];
  generating: boolean;
  onGenerate: (req: Omit<GenerateRequest, "boardId" | "sourceIds">) => void;
}) {
  const [goal, setGoal] = useState(GOAL_PRESETS[0]);
  const [count, setCount] = useState(4);

  const usingAll = fedSources.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-5 p-5">
        <Field label="What's feeding the lab">
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
          <GoalEditor value={goal} onChange={setGoal} mentionables={mentionables} />
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
          {mentionables.length > 0 && (
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              Tip: type <span className="font-mono text-cc-magenta">@</span> to
              reference a group or source.
            </p>
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
      </div>

      <div className="mt-auto border-t border-[var(--line)] p-5">
        {generating ? (
          <GenerationStatus />
        ) : (
          <button
            disabled={!goal.trim()}
            onClick={() => onGenerate({ goal, count })}
            className="btn-chrome w-full !py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✦ Generate concepts
          </button>
        )}
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
        Everything here gets fed to the lab on every generation. Edit anything —
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

function GenerationStatus() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setT((performance.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, []);

  let label: string;
  let glyph: string;
  if (t < 3) {
    glyph = "◐";
    label = "Reading sources";
  } else if (t < 12) {
    glyph = "✦";
    label = "Cooking concepts";
  } else if (t < 30) {
    glyph = "◑";
    label = "Polishing";
  } else {
    glyph = "◌";
    label = "Still working — complex briefs sometimes run long";
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-full py-3 text-center font-mono text-[12px] uppercase tracking-[0.14em] text-black"
      style={{
        background:
          "linear-gradient(100deg, #2B2BFF, #4B2EC9, #8A2BE2, #FF4FD8, #FF7AA2, #FFC04D, #FFE96B, #FF4FD8, #8A2BE2, #2B2BFF)",
        backgroundSize: "300% 100%",
        animation: "sheen 2.4s linear infinite",
        boxShadow: "0 10px 36px -10px rgba(255,79,216,0.55)",
      }}
    >
      <span className="relative font-semibold">
        <span className="mr-2 inline-block animate-pulse">{glyph}</span>
        {label}
        <span className="ml-3 text-black/70">· {t.toFixed(1)}s</span>
      </span>
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

/* ------------------------- @-mention-aware textarea ----------------------- */

function GoalEditor({
  value,
  onChange,
  mentionables,
}: {
  value: string;
  onChange: (v: string) => void;
  mentionables: { kind: "group" | "source"; label: string }[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [atIdx, setAtIdx] = useState(-1);
  const [active, setActive] = useState(0);

  const matches = open
    ? mentionables
        .filter((m) =>
          m.label.toLowerCase().includes(query.toLowerCase().trim())
        )
        .slice(0, 8)
    : [];

  const onChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    const caret = e.target.selectionStart ?? next.length;
    // find the nearest unclosed @ before the caret
    const upto = next.slice(0, caret);
    const at = upto.lastIndexOf("@");
    const tail = at >= 0 ? upto.slice(at + 1) : "";
    // only valid if @ is start of line OR preceded by whitespace AND no whitespace in tail
    const before = at > 0 ? upto[at - 1] : "";
    const valid =
      at >= 0 && (at === 0 || /\s/.test(before)) && !/\s/.test(tail);
    if (valid) {
      setAtIdx(at);
      setQuery(tail);
      setOpen(true);
      setActive(0);
    } else {
      setOpen(false);
    }
  };

  const insert = (m: { kind: "group" | "source"; label: string }) => {
    if (atIdx < 0 || !ref.current) return;
    const insertion = `@"${m.label}"`;
    const before = value.slice(0, atIdx);
    const after = value.slice((ref.current.selectionStart ?? atIdx) || atIdx);
    const next = before + insertion + " " + after;
    onChange(next);
    setOpen(false);
    // restore caret after insertion
    requestAnimationFrame(() => {
      if (!ref.current) return;
      const pos = (before + insertion + " ").length;
      ref.current.focus();
      ref.current.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insert(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onChangeText}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        rows={4}
        className="input resize-y min-h-[6rem] max-h-[60vh]"
        placeholder='What do you want the lab to make? Type @ to reference a group, e.g. @"Past examples".'
      />
      {open && matches.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-56 overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-[var(--bg-floating)] p-1 shadow-glow">
          {matches.map((m, i) => (
            <button
              key={m.kind + ":" + m.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insert(m);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                active === i ? "bg-cc-magenta/15 text-[var(--text)]" : "text-[var(--text-dim)]"
              }`}
            >
              <span
                className="grid h-5 w-5 place-items-center rounded-md text-[10px]"
                style={{
                  background:
                    m.kind === "group" ? "rgba(75,46,201,0.25)" : "rgba(138,43,226,0.22)",
                  color: m.kind === "group" ? "#8A2BE2" : "#FF7AA2",
                }}
              >
                {m.kind === "group" ? "▦" : "◌"}
              </span>
              <span className="truncate">{m.label}</span>
              <span className="ml-auto label text-[var(--text-muted)]">
                {m.kind}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
