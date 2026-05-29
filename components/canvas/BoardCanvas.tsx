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
import { nodeTypes, type NodeData } from "./nodeTypes";
import { KIND_META } from "./NodeChrome";
import { GenerationPanel } from "./GenerationPanel";
import { OutputCard } from "./OutputCard";
import { AddSourceModal, type AddPayload } from "./AddSourceModal";

type SourceKind = Exclude<NodeKind, "note" | "output">;
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
  const { screenToFlowPosition } = useReactFlow();
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
    (n: BoardNode): Node<NodeData> => ({
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
    }),
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

  /* ---- autosave ----
     The latest graph lives in a ref so we can save imperatively (on change,
     on demand, and on page-exit) without stale closures. */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const graphRef = useRef({ nodes, edges });

  const buildPayload = useCallback(() => {
    const { nodes, edges } = graphRef.current;
    return JSON.stringify({
      nodes: nodes.map((n) => ({
        ...n.data.node,
        position: n.position,
        boardId: board.id,
      })),
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

  const handleAddSource = async (payload: AddPayload) => {
    const src = await createSource({ ...payload, boardId: board.id });
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
    };
    setNodes((nds) => [...nds, toRf(node)]);
    setSelected((prev) => new Set(prev).add(id));
    setAdding(null);
  };

  /* ---- source nodes available for feeding ---- */
  const sourceNodes = useMemo(
    () => nodes.filter((n) => n.data.node.kind !== "note" && n.data.node.kind !== "output"),
    [nodes]
  );
  const fedSources = useMemo(
    () => sourceNodes.filter((n) => selected.has(n.id)).map((n) => n.data.node),
    [sourceNodes, selected]
  );

  /* ---- generate ---- */
  const runGeneration = async (
    opts: Omit<GenerateRequest, "boardId" | "sourceIds">
  ) => {
    const fed = fedSources.length ? fedSources : sourceNodes.map((n) => n.data.node);
    const sourceIds = fed.map((n) => n.sourceId).filter((v): v is string => !!v);
    setGenerating(true);
    try {
      const result = await api<GenerationResult>("/api/generate", {
        method: "POST",
        body: JSON.stringify({ ...opts, boardId: board.id, sourceIds }),
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
          title="Add note"
        >
          ✎ Note
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
