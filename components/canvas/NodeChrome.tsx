"use client";

import { Handle, Position } from "reactflow";
import type { NodeKind } from "@/lib/types";

export const KIND_META: Record<
  NodeKind,
  { label: string; glyph: string; accent: string }
> = {
  pdf: { label: "PDF", glyph: "▤", accent: "#FF7AA2" },
  document: { label: "DOC", glyph: "≣", accent: "#FFC04D" },
  website: { label: "WEB", glyph: "⊕", accent: "#2B2BFF" },
  youtube: { label: "VIDEO", glyph: "▶", accent: "#FF4FD8" },
  image: { label: "IMAGE", glyph: "◧", accent: "#8A2BE2" },
  note: { label: "NOTE", glyph: "✎", accent: "#FFE96B" },
  output: { label: "CONCEPTS", glyph: "✦", accent: "#FF4FD8" },
  group: { label: "GROUP", glyph: "▦", accent: "#4B2EC9" },
};

export function NodeShell({
  kind,
  selected,
  selectable,
  onToggle,
  onDelete,
  children,
  width = 268,
  noTarget,
}: {
  kind: NodeKind;
  selected?: boolean;
  selectable?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  width?: number;
  noTarget?: boolean;
}) {
  const meta = KIND_META[kind];
  return (
    <div
      className="group relative rounded-2xl border bg-[var(--bg-elevated)] shadow-node transition-shadow"
      style={{
        width,
        borderColor: selected ? meta.accent : "var(--line-strong)",
        boxShadow: selected
          ? `0 0 0 1px ${meta.accent}, 0 18px 50px -18px ${meta.accent}88`
          : undefined,
      }}
    >
      {!noTarget && <Handle type="target" position={Position.Left} />}
      <Handle type="source" position={Position.Right} />

      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        <span
          className="grid h-5 w-5 place-items-center rounded-md text-[11px]"
          style={{ background: `${meta.accent}22`, color: meta.accent }}
        >
          {meta.glyph}
        </span>
        <span
          className="label"
          style={{ color: meta.accent, letterSpacing: "0.16em" }}
        >
          {meta.label}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {selectable && (
            <button
              onClick={onToggle}
              title={selected ? "Remove from brain selection" : "Feed to the lab"}
              className="rounded-md border px-1.5 py-0.5 text-[10px] transition-colors"
              style={{
                borderColor: selected ? meta.accent : "var(--line-strong)",
                color: selected ? "#0a0a0a" : "var(--text-muted)",
                background: selected ? meta.accent : "transparent",
              }}
            >
              {selected ? "✓ FED" : "+ FEED"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete node"
              className="rounded-md px-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text)] group-hover:opacity-100"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
}
