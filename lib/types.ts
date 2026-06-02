export type NodeKind =
  | "pdf"
  | "document"
  | "website"
  | "youtube"
  | "image"
  | "note"
  | "output"
  | "group";

export interface CanvasPosition {
  x: number;
  y: number;
}

/** A node living on a board's canvas. */
export interface BoardNode {
  id: string;
  boardId: string;
  kind: NodeKind;
  position: CanvasPosition;
  /** display title shown on the node header */
  title: string;
  /** for source nodes, points at a BrainSource; output nodes embed their result */
  sourceId?: string;
  /** free text for notes, or short preview text for sources */
  text?: string;
  /** url for website / youtube / image nodes */
  url?: string;
  /** OPTIONAL — per-source instruction telling Claude how to use this
   *  specific source on this board (e.g. "use as aesthetic reference only,
   *  not strict guideline"). Lives on the node so the same source can be
   *  used differently across boards. */
  useFor?: string;
  /** embedded generation result for output nodes */
  output?: GenerationResult;
  width?: number;
  height?: number;
  /** If this node lives inside a group, the parent group node's id.
   *  When set, the node's position is RELATIVE to the group's top-left. */
  parentId?: string;
  /** Only meaningful on group nodes — the AI instruction for every source in this group. */
  groupInstruction?: string;
}

export interface BoardEdge {
  id: string;
  boardId: string;
  source: string;
  target: string;
}

export interface Board {
  id: string;
  /** Client / brand name — every board IS a client workspace */
  name: string;
  /** One-liner — niche, what they do */
  tagline?: string;
  /** How the brand speaks (short, voice-y description) */
  voice?: string;
  /** Who they're talking to */
  audience?: string;
  /** Name of the doctrine / playbook (e.g. "APEX Viral Hook Doctrine") */
  doctrineName?: string;
  /** The framework text the AI must pattern-match to */
  framework?: string;
  /** Extracted text from an uploaded brand/voice PDF — fed to the AI */
  referenceDoc?: string;
  /** Free-form notes (replaces the old separate Talent concept) */
  notes?: string;
  /** legacy — kept for back-compat with any existing rows */
  clientId?: string;
  createdAt: string;
  updatedAt: string;
}

/** A reusable piece of ingested context — the "content brain". */
export interface BrainSource {
  id: string;
  kind: Exclude<NodeKind, "note" | "output">;
  title: string;
  url?: string;
  /** extracted, searchable text */
  content: string;
  /** short auto summary */
  summary?: string;
  tokens?: number;
  /** which board (client workspace) owns this source */
  boardId?: string;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  niche: string;
  voice: string;
  audience: string;
  notes?: string;
  /** extracted text from an uploaded brand/voice PDF — fed to the AI as context */
  referenceDoc?: string;
  createdAt: string;
}

export interface TalentProfile {
  id: string;
  clientId?: string;
  name: string;
  persona: string;
  delivery: string;
  doNots?: string;
  createdAt: string;
}

/** The framework/doctrine the AI must pattern-match every output against. */
export interface Doctrine {
  id: string;
  clientId?: string;
  name: string;
  framework: string;
  createdAt: string;
}

export interface IdeaVariant {
  label: string;
  twist: string;
}

export interface ContentIdea {
  format: string;
  concept: string;
  hooks: string[];
  prompts: string[];
  whyItWorks: string;
  citations: string[];
  variants: IdeaVariant[];
}

export interface GenerationResult {
  id: string;
  goal: string;
  ideas: ContentIdea[];
  sourceIds: string[];
  sourceTitles: string[];
  /** Name of the board/client this was generated for */
  boardName?: string;
  model: string;
  grounded: boolean;
  createdAt: string;
}

export interface HistoryEntry extends GenerationResult {
  boardId: string;
}

export interface GenerateRequest {
  boardId?: string;
  goal: string;
  sourceIds: string[];
  count?: number;
  /** job-level instruction strings (e.g. "Talent never reads a script.") —
   *  typically drawn from Note nodes the user fed in. */
  instructions?: string[];
  /** map of sourceId -> per-source "use this for" instruction */
  sourceContext?: Record<string, string>;
  /** map of sourceId -> { name, instruction } of the group that source belongs to */
  sourceGroup?: Record<string, { name: string; instruction?: string }>;
  /** Every group on the board, so @-mentions in the goal resolve. */
  groups?: { name: string; instruction?: string }[];
}
