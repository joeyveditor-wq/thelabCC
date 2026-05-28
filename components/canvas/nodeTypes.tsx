"use client";

import { memo } from "react";
import Image from "next/image";
import type { NodeProps } from "reactflow";
import type { BoardNode, GenerationResult } from "@/lib/types";
import { youTubeId } from "@/lib/ingest";
import { NodeShell } from "./NodeChrome";

export interface NodeData {
  node: BoardNode;
  selected?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  onChange?: (patch: Partial<BoardNode>) => void;
  onOpenOutput?: (result: GenerationResult) => void;
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
    </NodeShell>
  );
});
SourceNode.displayName = "SourceNode";

const NoteNode = memo(({ data }: NodeProps<NodeData>) => {
  const { node } = data;
  return (
    <NodeShell
      kind="note"
      onDelete={data.onDelete}
      width={232}
    >
      <textarea
        defaultValue={node.text}
        placeholder="Type a thought…"
        onBlur={(e) => data.onChange?.({ text: e.target.value })}
        className="min-h-[84px] w-full resize-none bg-transparent text-[13px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
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

export const nodeTypes = {
  pdf: SourceNode,
  document: SourceNode,
  website: SourceNode,
  youtube: SourceNode,
  image: SourceNode,
  note: NoteNode,
  output: OutputNode,
} as const;

export type { BoardNode };
