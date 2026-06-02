"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps } from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import type { BoardNode, GenerationResult } from "@/lib/types";
import { youTubeId } from "@/lib/ingest";
import { NodeShell } from "./NodeChrome";

/** Reserved top area inside a group for its header + instruction. */
export const GROUP_HEADER_HEIGHT = 96;

export interface NodeData {
  node: BoardNode;
  selected?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  onChange?: (patch: Partial<BoardNode>) => void;
  onOpenOutput?: (result: GenerationResult) => void;
  /** For groups only: toggles selection on every child source. */
  onFeedGroup?: () => void;
  /** For groups only: how many children, how many of them are fed. */
  groupCount?: { total: number; fed: number };
}

const SourceNode = memo(({ data }: NodeProps<NodeData>) => {
  const { node } = data;
  return (
    <NodeShell
      kind={node.kind}
      selectable
      selected={data.selected}
      onToggle={data.onToggle}
      onDelete={data.onDelete}
    >
      <p className="mb-1 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
        {node.title}
      </p>

      {node.kind === "youtube" && node.url && (
        <div className="relative mb-2 aspect-video overflow-hidden rounded-lg border border-[var(--line)]">
          <Image
            src={`https://i.ytimg.com/vi/${youTubeId(node.url) ?? ""}/hqdefault.jpg`}
            alt=""
            fill
            sizes="240px"
            className="object-cover"
            unoptimized
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-1.5 left-1.5 grid h-7 w-7 place-items-center rounded-full bg-cc-magenta text-black">
            ▶
          </span>
        </div>
      )}

      {node.kind === "image" && node.url && (
        <div className="relative mb-2 aspect-video overflow-hidden rounded-lg border border-[var(--line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={node.url} alt={node.title} className="h-full w-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent mix-blend-multiply" />
        </div>
      )}

      {node.text && (
        <p className="line-clamp-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
          {node.text}
        </p>
      )}
      {node.url && node.kind !== "image" && (
        <p className="mt-1.5 truncate font-mono text-[10px] text-[var(--text-muted)]">
          {node.url}
        </p>
      )}

      <UseForEditor
        value={node.useFor}
        onChange={(v) => data.onChange?.({ useFor: v })}
      />
    </NodeShell>
  );
});
SourceNode.displayName = "SourceNode";

function UseForEditor({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (editing) {
    return (
      <div className="mt-2 rounded-lg border border-cc-magenta/60 bg-cc-magenta/10 p-1.5">
        <p className="label mb-1 flex items-center gap-1 text-[10px] text-cc-magenta">
          <span>⌘</span> USE THIS FOR
        </p>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const trimmed = draft.trim();
            if (trimmed !== (value ?? "")) onChange(trimmed);
          }}
          rows={3}
          placeholder="How should the lab use this source?"
          className="nodrag w-full resize-none bg-transparent text-[11px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>
    );
  }

  if (value && value.trim()) {
    return (
      <button
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="mt-2 block w-full rounded-lg border border-cc-magenta/40 bg-cc-magenta/10 p-1.5 text-left transition-colors hover:border-cc-magenta"
        title="Edit the lab's instruction for this source"
      >
        <p className="label mb-1 flex items-center gap-1 text-[10px] text-cc-magenta">
          <span>⌘</span> USE THIS FOR · ✎
        </p>
        <p className="line-clamp-3 text-[11px] leading-relaxed text-[var(--text-dim)]">
          {value}
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft("");
        setEditing(true);
      }}
      className="mt-2 w-full rounded-lg border border-dashed border-[var(--line-strong)] px-2 py-1.5 text-[10px] text-[var(--text-muted)] transition-colors hover:border-cc-magenta hover:text-[var(--text)]"
      title="Add a lab instruction for this source"
    >
      + Tell the lab how to use this
    </button>
  );
}

const NoteNode = memo(({ data }: NodeProps<NodeData>) => {
  const { node } = data;
  return (
    <NodeShell
      kind="note"
      selectable
      selected={data.selected}
      onToggle={data.onToggle}
      onDelete={data.onDelete}
      width={232}
    >
      <p className="label mb-1.5 flex items-center gap-1 text-[10px] text-cc-yellow">
        <span>⌘</span> INSTRUCTION WHEN FED
      </p>
      <textarea
        defaultValue={node.text}
        placeholder="A pinned instruction for the lab. E.g. 'Talent never reads a script.' Hit + FEED above to include it on the next generation."
        onBlur={(e) => data.onChange?.({ text: e.target.value })}
        className="nodrag min-h-[84px] w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </NodeShell>
  );
});
NoteNode.displayName = "NoteNode";

const OutputNode = memo(({ data }: NodeProps<NodeData>) => {
  const { node } = data;
  const r = node.output;
  return (
    <div
      className="concept-trophy group relative animate-rise-in"
      style={{ width: 340 }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {/* Inner card */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(180deg, var(--bg-elevated), var(--bg-raised))",
        }}
      >
        {/* Top chrome ribbon */}
        <div
          className="px-3 py-2"
          style={{
            background:
              "linear-gradient(100deg, rgba(43,43,255,0.18), rgba(138,43,226,0.22), rgba(255,79,216,0.28), rgba(255,192,77,0.18))",
            backgroundSize: "200% 100%",
            animation: "sheen 6s linear infinite",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="grid h-6 w-6 place-items-center rounded-md text-[12px]"
              style={{
                background: "linear-gradient(135deg, #FF4FD8, #FFC04D)",
                color: "#0a0a0a",
                boxShadow: "0 0 14px -2px rgba(255,79,216,0.7)",
              }}
            >
              ✦
            </span>
            <span
              className="display text-[14px] tracking-widest text-chrome"
              style={{ letterSpacing: "0.22em" }}
            >
              CONCEPTS
            </span>
            <span className="ml-auto label text-[var(--text-muted)]">
              {r?.ideas.length ?? 0} ideas
            </span>
            {data.onDelete && (
              <button
                onClick={data.onDelete}
                className="ml-1 rounded-md px-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text)] group-hover:opacity-100"
                title="Delete this concept set"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-3 pb-3 pt-2.5">
          <p className="mb-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
            {r?.goal ?? node.title}
          </p>
          {r?.ideas[0] && (
            <div
              className="rounded-lg border bg-[var(--bg)]/60 p-2.5"
              style={{ borderColor: "rgba(255,79,216,0.3)" }}
            >
              <p className="label mb-1 text-cc-magenta">
                {r.ideas[0].format}
              </p>
              <p className="line-clamp-2 text-[12px] italic text-[var(--text)]">
                {r.ideas[0].hooks[0]}
              </p>
            </div>
          )}
          {r && (
            <button
              onClick={() => data.onOpenOutput?.(r)}
              className="btn-chrome mt-3 w-full !py-2.5 !text-[12px]"
            >
              ✦ Open the holy grail
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
OutputNode.displayName = "OutputNode";

const GroupNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const { node } = data;
  const count = data.groupCount ?? { total: 0, fed: 0 };
  const allFed = count.total > 0 && count.fed === count.total;

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={300}
        minHeight={220}
        lineStyle={{ borderColor: "#8A2BE2", borderWidth: 1.5 }}
        handleStyle={{
          background: "#FF4FD8",
          border: "2px solid #0a0a0a",
          width: 10,
          height: 10,
          borderRadius: 999,
        }}
      />
      <div
        className="group relative h-full w-full rounded-3xl border-2 border-dashed transition-colors"
        style={{
          borderColor: allFed ? "#FF4FD8" : "rgba(75, 46, 201, 0.55)",
          background:
            "linear-gradient(180deg, rgba(75,46,201,0.08), rgba(75,46,201,0.02))",
          boxShadow: allFed
            ? "0 0 0 1px rgba(255,79,216,0.4), 0 16px 60px -20px rgba(255,79,216,0.4)"
            : undefined,
        }}
      >
        {/* Header zone — transparent so the dashed border owns the look;
            children dropped here are clamped out of this area. */}
        <div
          className="nodrag absolute inset-x-0 top-0 z-10"
          style={{ height: GROUP_HEADER_HEIGHT }}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <span
              className="grid h-6 w-6 place-items-center rounded-md text-[12px]"
              style={{
                background: "linear-gradient(135deg, #8A2BE2, #FF4FD8)",
                color: "#fff",
                boxShadow: "0 4px 14px -4px rgba(255,79,216,0.6)",
              }}
            >
              ▦
            </span>
            <span
              className="label font-semibold"
              style={{
                color: "#FF7AA2",
                letterSpacing: "0.18em",
                textShadow: "0 1px 8px rgba(0,0,0,0.6)",
              }}
            >
              GROUP
            </span>
            <input
              value={node.title}
              placeholder="Name this group (e.g. Past examples)"
              onChange={(e) => data.onChange?.({ title: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-[var(--text)] outline-none placeholder:font-normal placeholder:text-[var(--text-muted)]"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.65)" }}
            />
            <button
              onClick={data.onFeedGroup}
              title={
                allFed ? "Unfeed all sources in this group" : "Feed all sources in this group"
              }
              className="rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors"
              style={{
                borderColor: allFed ? "#FF4FD8" : "rgba(255,79,216,0.45)",
                color: allFed ? "#0a0a0a" : "#FF7AA2",
                background: allFed ? "#FF4FD8" : "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
              }}
              disabled={count.total === 0}
            >
              {allFed ? "✓ FED" : `+ FEED ${count.total ? `(${count.total})` : ""}`}
            </button>
            {data.onDelete && (
              <button
                onClick={data.onDelete}
                title="Delete group (children move out)"
                className="rounded-md px-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-cc-coral group-hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
          <div className="px-3">
            <textarea
              value={node.groupInstruction ?? ""}
              placeholder="Tell the lab how to use everything in this group (optional). E.g. 'Use as reference for structure, not voice.'"
              onChange={(e) => data.onChange?.({ groupInstruction: e.target.value })}
              rows={1}
              className="w-full resize-none rounded-lg border bg-black/55 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-[var(--text)] outline-none backdrop-blur placeholder:text-[var(--text-muted)] focus:bg-black/70"
              style={{
                borderColor: "rgba(255,79,216,0.35)",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
});
GroupNode.displayName = "GroupNode";

export const nodeTypes = {
  pdf: SourceNode,
  document: SourceNode,
  website: SourceNode,
  youtube: SourceNode,
  image: SourceNode,
  note: NoteNode,
  output: OutputNode,
  group: GroupNode,
} as const;

export type { BoardNode };
