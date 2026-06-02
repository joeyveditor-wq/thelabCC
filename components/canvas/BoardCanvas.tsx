"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import type {
  Board,
  BoardEdge,
  BoardNode,
  GenerateRequest,
  GenerationResult,
  HistoryEntry,
  NodeKind,
} from "@/lib/types";
import { api, createSource } from "@/lib/client";
import { nodeTypes, type NodeData, GROUP_HEADER_HEIGHT } from "./nodeTypes";
import { KIND_META } from "./NodeChrome";
import { GenerationPanel } from "./GenerationPanel";
import { OutputCard } from "./OutputCard";
import { AddSourceModal, type AddPayload } from "./AddSourceModal";

type SourceKind = Exclude<NodeKind, "note" | "output" | "group">;
const SOURCE_KINDS: SourceKind[] = ["pdf", "document", "website", "youtube", "image"];

interface InitialData {
  board: Board;
  nodes: BoardNode[];
  edges: BoardEdge[];
  history: HistoryEntry[];
}

export function BoardCanvas(props: InitialData) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  board: initialBoard,
  nodes: initialNodes,
  edges: initialEdges,
  history: initialHistory,
}: InitialData) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const { screenToFlowPosition, getIntersectingNodes, getNode } = useReactFlow<NodeData>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [openOutput, setOpenOutput] = useState<GenerationResult | null>(null);
  const [adding, setAdding] = useState<SourceKind | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving" | "unsaved" | "error">("saved");

  /* stable handlers keyed by node id */
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    // setters are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const changeNode = useCallback((id: string, patch: Partial<BoardNode>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, node: { ...n.data.node, ...patch } } } : n
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openOutputModal = useCallback((r: GenerationResult) => setOpenOutput(r), []);

  const toRf = useCallback(
    (n: BoardNode): Node<NodeData> => {
      const rf: Node<NodeData> = {
        id: n.id,
        type: n.kind,
        position: n.position,
        data: {
          node: n,
          selected: false,
          onToggle: () => toggleSelect(n.id),
          onDelete: () => deleteNode(n.id),
          onChange: (patch) => changeNode(n.id, patch),
          onOpenOutput: openOutputModal,
        },
      };
      if (n.kind === "group") {
        rf.style = { width: n.width ?? 460, height: n.height ?? 340 };
        rf.zIndex = 0;
      } else {
        rf.zIndex = 1;
      }
      if (n.parentId) {
        rf.parentNode = n.parentId;
        // Intentionally NOT using extent: "parent" — we allow dragging children
        // out, which removes them from the group (the agreed UX).
      }
      return rf;
    },
    [toggleSelect, deleteNode, changeNode, openOutputModal]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(
    initialNodes.map(toRf)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: true }))
  );

  /* reflect selection set into node data */
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.data.selected === selected.has(n.id)
          ? n
          : { ...n, data: { ...n.data, selected: selected.has(n.id) } }
      )
    );
  }, [selected, setNodes]);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) => addEdge({ ...c, id: nanoid(), animated: true }, eds)),
    [setEdges]
  );

  /* ---- drag-into / drag-out of group nodes ---- */
  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent, draggedRf: Node<NodeData>) => {
      if (draggedRf.data?.node.kind === "group") return; // groups don't nest

      // Compute the dragged node's ABSOLUTE position (children store relative)
      let absX = draggedRf.position.x;
      let absY = draggedRf.position.y;
      const oldParentId = draggedRf.data?.node.parentId;
      if (oldParentId) {
        const p = getNode(oldParentId);
        if (p) {
          absX += p.position.x;
          absY += p.position.y;
        }
      }

      // Build a temp node at absolute position for intersection testing
      const probe: Node<NodeData> = {
        ...draggedRf,
        position: { x: absX, y: absY },
        parentNode: undefined,
      };
      const hits = getIntersectingNodes(probe).filter(
        (n) => n.data?.node.kind === "group" && n.id !== draggedRf.id
      );
      const newGroup = hits[0]; // pick first hit (top-most)

      if (!newGroup && !oldParentId) return; // no change
      if (newGroup && newGroup.id === oldParentId) return; // still in same group

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== draggedRf.id) return n;
          if (newGroup) {
            const relX = absX - newGroup.position.x;
            const rawRelY = absY - newGroup.position.y;
            // Keep the dropped node clear of the group's header zone so the
            // group's instruction textarea stays visible.
            const relY = Math.max(rawRelY, GROUP_HEADER_HEIGHT + 8);
            return {
              ...n,
              position: { x: relX, y: relY },
              parentNode: newGroup.id,
              data: { ...n.data, node: { ...n.data.node, parentId: newGroup.id } },
            };
          }
          // dropped outside any group — strip parent, restore absolute position
          const stripped = { ...n.data.node };
          delete stripped.parentId;
          return {
            ...n,
            position: { x: absX, y: absY },
            parentNode: undefined,
            data: { ...n.data, node: stripped },
          };
        })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getIntersectingNodes, getNode]
  );

  /* ---- group feed: toggle all children's selection together ---- */
  const feedGroup = useCallback(
    (groupId: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const childIds = nodes
          .filter((n) => n.data.node.parentId === groupId && n.data.node.kind !== "note" && n.data.node.kind !== "output")
          .map((n) => n.id);
        if (childIds.length === 0) return prev;
        const allFed = childIds.every((id) => next.has(id));
        if (allFed) childIds.forEach((id) => next.delete(id));
        else childIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [nodes]
  );

  /* inject group helpers + child counts into group node data on every change */
  useEffect(() => {
    setNodes((nds) => {
      let changed = false;
      const next = nds.map((n) => {
        if (n.data.node.kind !== "group") return n;
        const children = nds.filter(
          (c) =>
            c.data.node.parentId === n.id &&
            c.data.node.kind !== "note" &&
            c.data.node.kind !== "output"
        );
        const fedCount = children.filter((c) => selected.has(c.id)).length;
        const newData = {
          ...n.data,
          onFeedGroup: () => feedGroup(n.id),
          groupCount: { total: children.length, fed: fedCount },
        };
        if (
          n.data.onFeedGroup &&
          n.data.groupCount?.total === newData.groupCount.total &&
          n.data.groupCount?.fed === newData.groupCount.fed
        ) {
          return n;
        }
        changed = true;
        return { ...n, data: newData };
      });
      return changed ? next : nds;
    });
  }, [nodes.length, selected, feedGroup, setNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- autosave ----
     The latest graph lives in a ref so we can save imperatively (on change,
     on demand, and on page-exit) without stale closures. */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const graphRef = useRef({ nodes, edges });

  const buildPayload = useCallback(() => {
    const { nodes, edges } = graphRef.current;
    return JSON.stringify({
      nodes: nodes.map((n) => {
        const base = {
          ...n.data.node,
          position: n.position,
          boardId: board.id,
        };
        // Groups: persist the current (possibly resized) dimensions from RF style.
        if (n.data.node.kind === "group") {
          const w = typeof n.style?.width === "number" ? n.style.width : n.width;
          const h = typeof n.style?.height === "number" ? n.style.height : n.height;
          if (typeof w === "number") base.width = w;
          if (typeof h === "number") base.height = h;
        }
        return base;
      }),
      edges: edges.map((e) => ({
        id: e.id,
        boardId: board.id,
        source: e.source,
        target: e.target,
      })),
    });
  }, [board.id]);

  const saveNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaved("saving");
    return api(`/api/boards/${board.id}/graph`, {
      method: "PUT",
      body: buildPayload(),
    })
      .then(() => setSaved("saved"))
      .catch(() => setSaved("error"));
  }, [board.id, buildPayload]);

  /* keep the ref current + debounce-save on every graph change */
  useEffect(() => {
    graphRef.current = { nodes, edges };
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setSaved("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, edges, saveNow]);

  /* flush pending changes when the tab is hidden, closed, or navigated away
     — keepalive lets the request complete even as the page unloads */
  useEffect(() => {
    const flush = () => {
      fetch(`/api/boards/${board.id}/graph`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: buildPayload(),
        keepalive: true,
      }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [board.id, buildPayload]);

  /* ---- add nodes ---- */
  const spawnPosition = () =>
    screenToFlowPosition({
      x: window.innerWidth / 2 - 180 + (Math.random() * 80 - 40),
      y: window.innerHeight / 2 - 120 + (Math.random() * 80 - 40),
    });

  const addNoteNode = () => {
    const id = nanoid();
    const node: BoardNode = {
      id,
      boardId: board.id,
      kind: "note",
      position: spawnPosition(),
      title: "Note",
      text: "",
    };
    setNodes((nds) => [...nds, toRf(node)]);
  };

  const addGroupNode = () => {
    const id = nanoid();
    const node: BoardNode = {
      id,
      boardId: board.id,
      kind: "group",
      position: spawnPosition(),
      title: "",
      width: 460,
      height: 340,
    };
    setNodes((nds) => [toRf(node), ...nds]); // unshift so it renders behind children
  };

  const handleAddSource = async (payload: AddPayload) => {
    const files = payload.files ?? [];
    const batch = files.length > 1;

    // No file (pasted text / URL) OR exactly one file → single path
    if (!batch) {
      const single = files[0];
      const src = await createSource({
        kind: payload.kind,
        url: payload.url,
        title: payload.title,
        text: payload.text,
        file: single,
        boardId: board.id,
      });
      const id = nanoid();
      const node: BoardNode = {
        id,
        boardId: board.id,
        kind: src.kind,
        position: spawnPosition(),
        title: src.title,
        sourceId: src.id,
        text: src.summary,
        url: src.url,
        useFor: payload.useFor,
      };
      setNodes((nds) => [...nds, toRf(node)]);
      setSelected((prev) => new Set(prev).add(id));
      setAdding(null);
      return;
    }

    // Multi-file batch: upload all in parallel, then grid them on the canvas.
    const center = spawnPosition();
    const cols = Math.ceil(Math.sqrt(files.length));
    const gapX = 300;
    const gapY = 280;
    const offset = (n: number) => (n - (cols - 1) / 2) * gapX;

    const sources = await Promise.all(
      files.map((f) =>
        createSource({
          kind: payload.kind,
          file: f,
          boardId: board.id,
        }).catch(() => null)
      )
    );

    const newNodes: Node<NodeData>[] = [];
    const newIds: string[] = [];
    sources.forEach((src, i) => {
      if (!src) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const id = nanoid();
      const node: BoardNode = {
        id,
        boardId: board.id,
        kind: src.kind,
        position: {
          x: center.x + offset(col),
          y: center.y + row * gapY,
        },
        title: src.title,
        sourceId: src.id,
        text: src.summary,
        url: src.url,
        useFor: payload.useFor,
      };
      newNodes.push(toRf(node));
      newIds.push(id);
    });

    setNodes((nds) => [...nds, ...newNodes]);
    setSelected((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });
    setAdding(null);
  };

  /* ---- nodes available for feeding ---- */
  const sourceNodes = useMemo(
    () => nodes.filter((n) => n.data.node.kind !== "note" && n.data.node.kind !== "output"),
    [nodes]
  );
  const noteNodes = useMemo(
    () => nodes.filter((n) => n.data.node.kind === "note"),
    [nodes]
  );
  const fedSources = useMemo(
    () => sourceNodes.filter((n) => selected.has(n.id)).map((n) => n.data.node),
    [sourceNodes, selected]
  );
  const fedInstructions = useMemo(
    () =>
      noteNodes
        .filter((n) => selected.has(n.id))
        .map((n) => n.data.node.text?.trim() || "")
        .filter(Boolean),
    [noteNodes, selected]
  );

  /* ---- generate ---- */
  const runGeneration = async (
    opts: Omit<GenerateRequest, "boardId" | "sourceIds">
  ) => {
    const fed = fedSources.length ? fedSources : sourceNodes.map((n) => n.data.node);
    const sourceIds = fed.map((n) => n.sourceId).filter((v): v is string => !!v);
    const sourceContext: Record<string, string> = {};
    for (const n of fed) {
      if (n.sourceId && n.useFor?.trim()) sourceContext[n.sourceId] = n.useFor.trim();
    }

    /* group references — by source id + flat groups list */
    const groupNodesById = new Map(
      nodes
        .filter((n) => n.data.node.kind === "group" && n.data.node.title?.trim())
        .map((n) => [n.id, n.data.node])
    );
    const sourceGroup: Record<string, { name: string; instruction?: string }> = {};
    for (const n of fed) {
      if (!n.sourceId || !n.parentId) continue;
      const g = groupNodesById.get(n.parentId);
      if (!g) continue;
      sourceGroup[n.sourceId] = {
        name: g.title,
        instruction: g.groupInstruction?.trim() || undefined,
      };
    }
    const groups = [...groupNodesById.values()].map((g) => ({
      name: g.title,
      instruction: g.groupInstruction?.trim() || undefined,
    }));

    setGenerating(true);
    try {
      const result = await api<GenerationResult>("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          ...opts,
          boardId: board.id,
          sourceIds,
          instructions: fedInstructions,
          sourceContext,
          sourceGroup,
          groups,
        }),
      });
      const id = nanoid();
      const node: BoardNode = {
        id,
        boardId: board.id,
        kind: "output",
        position: spawnPosition(),
        title: result.goal,
        output: result,
      };
      const rf = toRf(node);
      setNodes((nds) => [...nds, rf]);
      // connect fed sources -> output
      setEdges((eds) => [
        ...eds,
        ...fed.map((s) => ({
          id: nanoid(),
          source: s.id,
          target: id,
          animated: true,
        })),
      ]);
      setOpenOutput(result);
      setHistory((h) => [{ ...result, boardId: board.id }, ...h]);
    } catch (e) {
      alert("Generation failed: " + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--bg)]/80 px-6 py-3 backdrop-blur">
        <h1 className="display text-lg text-[var(--text)]">{board.name}</h1>
        {board.tagline && (
          <span className="hidden text-[12px] text-[var(--text-muted)] sm:inline">
            · {board.tagline}
          </span>
        )}
        <button
          onClick={() => setPanelOpen(true)}
          className="label ml-auto rounded-full border border-[var(--line-strong)] px-3 py-1 text-[var(--text-muted)] transition-colors hover:border-cc-magenta hover:text-[var(--text)]"
          title="Edit brand context"
        >
          ✎ Brand
        </button>
      </header>
      <div className="relative flex-1 w-full surface-grid">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="rgba(138,43,226,0.18)"
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => KIND_META[(n.type as NodeKind) ?? "note"].accent}
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: "var(--bg-elevated)" }}
        />
      </ReactFlow>

      {/* node toolbar */}
      <div className="pointer-events-none absolute left-1/2 top-5 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-raised)]/90 p-1.5 shadow-node backdrop-blur-xl">
        {SOURCE_KINDS.map((k) => (
          <ToolButton key={k} kind={k} onClick={() => setAdding(k)} />
        ))}
        <button
          onClick={addNoteNode}
          className="pointer-events-auto rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-floating)] hover:text-[var(--text)]"
          title="Add note (pin as instruction)"
        >
          ✎ Note
        </button>
        <span className="h-5 w-px bg-[var(--line-strong)]" />
        <button
          onClick={addGroupNode}
          className="pointer-events-auto rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-floating)] hover:text-[var(--text)]"
          title="Add group — drag sources inside to cluster them"
        >
          <span style={{ color: KIND_META.group.accent }}>▦</span> Group
        </button>
      </div>

      {/* save status */}
      <div className="absolute left-5 top-5 z-20">
        <button
          onClick={() => saveNow()}
          title="Click to save now"
          className="label rounded-full border bg-[var(--bg-raised)]/80 px-3 py-1.5 backdrop-blur transition-colors"
          style={{
            borderColor: saved === "error" ? "#FF7AA2" : "var(--line-strong)",
            color:
              saved === "error"
                ? "#FF7AA2"
                : saved === "saved"
                  ? "var(--text-muted)"
                  : "var(--text)",
          }}
        >
          {saved === "saving"
            ? "◌ Saving…"
            : saved === "saved"
              ? "✓ Saved"
              : saved === "error"
                ? "⚠ Not saved — click to retry"
                : "• Unsaved…"}
        </button>
      </div>

      {/* generate FAB */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="btn-chrome absolute bottom-6 right-6 z-20 !px-5 !py-3 animate-pulse-ring"
        >
          ✦ Generate
        </button>
      )}
      </div>{/* /canvas wrapper */}

      <GenerationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        board={board}
        onBoardChange={(patch) => {
          setBoard((b) => ({ ...b, ...patch }));
          api(`/api/boards/${board.id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          }).catch(() => {});
        }}
        fedSources={fedSources}
        allSourceCount={sourceNodes.length}
        fedInstructionCount={fedInstructions.length}
        mentionables={[
          ...nodes
            .filter((n) => n.data.node.kind === "group" && n.data.node.title?.trim())
            .map((n) => ({ kind: "group" as const, label: n.data.node.title })),
          ...sourceNodes.map((n) => ({
            kind: "source" as const,
            label: n.data.node.title,
          })),
        ]}
        history={history}
        onOpenHistory={(r) => setOpenOutput(r)}
        generating={generating}
        onGenerate={runGeneration}
      />

      {adding && (
        <AddSourceModal
          kind={adding}
          onClose={() => setAdding(null)}
          onSubmit={handleAddSource}
        />
      )}

      {openOutput && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => setOpenOutput(null)}
        >
          <div
            className="h-[86vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--bg-raised)] shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <OutputCard
              result={openOutput}
              onClose={() => setOpenOutput(null)}
              onRegenerate={() => {
                setOpenOutput(null);
                setPanelOpen(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({ kind, onClick }: { kind: SourceKind; onClick: () => void }) {
  const meta = KIND_META[kind];
  return (
    <button
      onClick={onClick}
      title={`Add ${meta.label}`}
      className="pointer-events-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-floating)] hover:text-[var(--text)]"
    >
      <span style={{ color: meta.accent }}>{meta.glyph}</span>
      {meta.label}
    </button>
  );
}
