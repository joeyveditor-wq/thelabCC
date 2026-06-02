"use client";

import { memo, useState } from "react";
import Image from "next/image";
import type { NodeProps } from "reactflow";
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
    <NodeShell
      kind="output"
      onDelete={data.onDelete}
      width={320}
    >
      <p className="mb-1 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
        {r?.goal ?? node.title}
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="label rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[var(--text-muted)]">
          {r?.ideas.length ?? 0} ideas
        </span>
        <span className="label rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[var(--text-muted)]">
          {r?.grounded ? "grounded" : "ungrounded"}
        </span>
      </div>
      {r?.ideas[0] && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-raised)] p-2">
          <p className="label mb-1 text-cc-magenta">{r.ideas[0].format}</p>
          <p className="line-clamp-2 text-[12px] italic text-[var(--text-dim)]">
            {r.ideas[0].hooks[0]}
          </p>
        </div>
      )}
      {r && (
        <button
          onClick={() => data.onOpenOutput?.(r)}
          className="btn-chrome mt-2.5 w-full !py-2 !text-[11px]"
        >
          View · Export
        </button>
      )}
    </NodeShell>
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
        {/* Solid header zone — children dropped above the divider are kept out of this area */}
        <div
          className="nodrag absolute inset-x-0 top-0 z-10 rounded-t-[1.4rem] border-b border-cc-violet/25 bg-[var(--bg)]/85 backdrop-blur"
          style={{ height: GROUP_HEADER_HEIGHT }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2">
            <span
              className="grid h-5 w-5 place-items-center rounded-md text-[11px]"
              style={{ background: "rgba(75,46,201,0.25)", color: "#8A2BE2" }}
            >
              ▦
            </span>
            <span
              className="label text-cc-violet"
              style={{ letterSpacing: "0.16em" }}
            >
              GROUP
            </span>
            <input
              value={node.title}
              placeholder="Group name (e.g. Past examples)"
              onChange={(e) => data.onChange?.({ title: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={data.onFeedGroup}
              title={
                allFed ? "Unfeed all sources in this group" : "Feed all sources in this group"
              }
              className="rounded-md border px-1.5 py-0.5 text-[10px] transition-colors"
              style={{
                borderColor: allFed ? "#FF4FD8" : "var(--line-strong)",
                color: allFed ? "#0a0a0a" : "var(--text-muted)",
                background: allFed ? "#FF4FD8" : "transparent",
              }}
              disabled={count.total === 0}
            >
              {allFed ? "✓ FED" : `+ FEED ${count.total ? `(${count.total})` : ""}`}
            </button>
            {data.onDelete && (
              <button
                onClick={data.onDelete}
                title="Delete group (children move out)"
                className="rounded-md px-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text)] group-hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
          <div className="px-3 pt-1.5">
            <textarea
              value={node.groupInstruction ?? ""}
              placeholder="Tell the lab how to use everything in this group (optional). E.g. 'Use as reference for structure, not voice.'"
              onChange={(e) => data.onChange?.({ groupInstruction: e.target.value })}
              rows={1}
              className="w-full resize-none rounded-lg border border-cc-violet/30 bg-cc-violet/10 px-2 py-1 text-[11px] leading-relaxed text-[var(--text-dim)] outline-none placeholder:text-[var(--text-muted)] focus:border-cc-violet"
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
