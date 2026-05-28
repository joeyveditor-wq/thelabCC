import type {
  Board,
  BoardEdge,
  BoardNode,
  BrainSource,
  ClientProfile,
  Doctrine,
  HistoryEntry,
  TalentProfile,
} from "./types";

export interface Query {
  [key: string]: string | undefined;
}

export interface Collection<T extends { id: string }> {
  all(query?: Query): Promise<T[]>;
  get(id: string): Promise<T | null>;
  insert(doc: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

export interface Store {
  boards: Collection<Board>;
  nodes: Collection<BoardNode>;
  edges: Collection<BoardEdge>;
  sources: Collection<BrainSource>;
  clients: Collection<ClientProfile>;
  talent: Collection<TalentProfile>;
  doctrines: Collection<Doctrine>;
  history: Collection<HistoryEntry>;
}

function matches<T extends Record<string, unknown>>(doc: T, query?: Query): boolean {
  if (!query) return true;
  return Object.entries(query).every(([k, v]) => {
    if (v === undefined) return true;
    return String((doc as Record<string, unknown>)[k] ?? "") === v;
  });
}

/* ----------------------------- in-memory store ---------------------------- */

class MemoryCollection<T extends { id: string }> implements Collection<T> {
  private docs = new Map<string, T>();

  constructor(seed: T[] = []) {
    for (const d of seed) this.docs.set(d.id, d);
  }

  async all(query?: Query): Promise<T[]> {
    return [...this.docs.values()].filter((d) =>
      matches(d as unknown as Record<string, unknown>, query)
    );
  }
  async get(id: string): Promise<T | null> {
    return this.docs.get(id) ?? null;
  }
  async insert(doc: T): Promise<T> {
    this.docs.set(doc.id, doc);
    return doc;
  }
  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const existing = this.docs.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch };
    this.docs.set(id, next);
    return next;
  }
  async remove(id: string): Promise<boolean> {
    return this.docs.delete(id);
  }
}

function buildMemoryStore(): Store {
  const seed = makeSeed();
  return {
    boards: new MemoryCollection(seed.boards),
    nodes: new MemoryCollection(seed.nodes),
    edges: new MemoryCollection(seed.edges),
    sources: new MemoryCollection(seed.sources),
    clients: new MemoryCollection(seed.clients),
    talent: new MemoryCollection(seed.talent),
    doctrines: new MemoryCollection(seed.doctrines),
    history: new MemoryCollection<HistoryEntry>([]),
  };
}

/* ------------------------------- mongo store ------------------------------ */

import type { Db, MongoClient } from "mongodb";

class MongoCollection<T extends { id: string }> implements Collection<T> {
  constructor(private db: Db, private name: string) {}
  private col() {
    return this.db.collection<T & { _id?: unknown }>(this.name);
  }
  private strip(doc: unknown): T | null {
    if (!doc) return null;
    const { _id, ...rest } = doc as T & { _id?: unknown };
    void _id;
    return rest as T;
  }
  async all(query?: Query): Promise<T[]> {
    const clean: Record<string, string> = {};
    if (query)
      for (const [k, v] of Object.entries(query)) if (v !== undefined) clean[k] = v;
    const docs = await this.col().find(clean as never).toArray();
    return docs.map((d) => this.strip(d)!) as T[];
  }
  async get(id: string): Promise<T | null> {
    return this.strip(await this.col().findOne({ id } as never));
  }
  async insert(doc: T): Promise<T> {
    await this.col().insertOne({ ...doc } as never);
    return doc;
  }
  async update(id: string, patch: Partial<T>): Promise<T | null> {
    await this.col().updateOne({ id } as never, { $set: patch } as never);
    return this.get(id);
  }
  async remove(id: string): Promise<boolean> {
    const r = await this.col().deleteOne({ id } as never);
    return r.deletedCount > 0;
  }
}

async function buildMongoStore(uri: string, dbName: string): Promise<Store> {
  const { MongoClient } = await import("mongodb");
  const client: MongoClient = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const store: Store = {
    boards: new MongoCollection(db, "boards"),
    nodes: new MongoCollection(db, "nodes"),
    edges: new MongoCollection(db, "edges"),
    sources: new MongoCollection(db, "sources"),
    clients: new MongoCollection(db, "clients"),
    talent: new MongoCollection(db, "talent"),
    doctrines: new MongoCollection(db, "doctrines"),
    history: new MongoCollection(db, "history"),
  };

  // seed once if empty
  const existing = await store.clients.all();
  if (existing.length === 0) {
    const seed = makeSeed();
    await Promise.all([
      ...seed.clients.map((d) => store.clients.insert(d)),
      ...seed.sources.map((d) => store.sources.insert(d)),
      ...seed.boards.map((d) => store.boards.insert(d)),
      ...seed.nodes.map((d) => store.nodes.insert(d)),
      ...seed.edges.map((d) => store.edges.insert(d)),
      ...seed.talent.map((d) => store.talent.insert(d)),
      ...seed.doctrines.map((d) => store.doctrines.insert(d)),
    ]);
  }
  return store;
}

/* ------------------------------ store accessor ---------------------------- */

declare global {
  // eslint-disable-next-line no-var
  var __ideaLabStore: Promise<Store> | undefined;
}

export function getStore(): Promise<Store> {
  if (!globalThis.__ideaLabStore) {
    const uri = process.env.MONGODB_URI;
    if (uri && uri.trim()) {
      globalThis.__ideaLabStore = buildMongoStore(
        uri,
        process.env.MONGODB_DB || "idea_lab"
      ).catch((err) => {
        console.error("[store] Mongo connection failed, using memory store:", err);
        return buildMemoryStore();
      });
    } else {
      globalThis.__ideaLabStore = Promise.resolve(buildMemoryStore());
    }
  }
  return globalThis.__ideaLabStore;
}

export function isMemoryStore(): boolean {
  return !(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
}

/* --------------------------------- seed ----------------------------------- */

function iso(daysAgo = 0): string {
  return new Date(Date.now() - daysAgo * 86400000).toISOString();
}

function makeSeed() {
  const clients: ClientProfile[] = [
    {
      id: "cl_demo",
      name: "APEX ATHLETICS",
      niche: "Sports performance & training apparel",
      voice: "High-energy, confident, locker-room direct. Short punchy lines. No corporate filler.",
      audience: "18-34 competitive athletes, gym-goers, and weekend warriors who chase progress.",
      notes: "Founder is a former D1 sprinter. Loves underdog-vs-elite framing.",
      createdAt: iso(20),
    },
  ];

  const sources: BrainSource[] = [
    {
      id: "src_doctrine_doc",
      kind: "document",
      title: "Hook Framework v3 (Doctrine)",
      content:
        "Every short-form opener must land in <2s. Use one of: (1) Contrarian claim, (2) Specific number + stakes, (3) Visible transformation tease, (4) Callout to a named enemy/myth. Never open with a greeting. The first frame must show motion or a result. Reward curiosity within 3s or viewers bounce.",
      summary: "Internal proven-hook doctrine: sub-2s openers, 4 hook archetypes, no greetings.",
      tokens: 86,
      clientId: "cl_demo",
      createdAt: iso(18),
    },
    {
      id: "src_yt_1",
      kind: "youtube",
      title: "Why 99% of athletes train wrong (12M views)",
      url: "https://www.youtube.com/watch?v=demo1",
      content:
        "Transcript: Most athletes confuse activity with progress. They show up, they sweat, they leave — but they never track the one metric that matters: rate of force development. In this video we break down how a 0.2 second improvement off the line separates pros from amateurs. The drill nobody films but everyone should...",
      summary: "Viral video arguing athletes track the wrong metrics; RFD is the real differentiator.",
      tokens: 71,
      clientId: "cl_demo",
      createdAt: iso(12),
    },
    {
      id: "src_web_1",
      kind: "website",
      title: "Sprint mechanics study — journal article",
      url: "https://example.com/sprint-mechanics",
      content:
        "Findings: elite sprinters spend less ground-contact time (sub-0.09s) and apply force more vertically. Training horizontal force output yields the largest acceleration gains for sub-elite athletes. Plyometric progression over 8 weeks improved 10m splits by an average of 4.1%.",
      summary: "Study: ground-contact time and horizontal force drive acceleration; 8-wk plyo = +4.1%.",
      tokens: 64,
      clientId: "cl_demo",
      createdAt: iso(9),
    },
    {
      id: "src_pdf_1",
      kind: "pdf",
      title: "APEX Brand Voice Bible.pdf",
      content:
        "APEX speaks like a coach who believes in you but won't coddle you. Tone: 80% encouragement, 20% challenge. Banned words: 'synergy', 'leverage', 'unlock your potential'. Signature phrases: 'Earn it.', 'Reps don't lie.', 'Comfort is the enemy.'",
      summary: "Brand voice: coach energy, 80/20 encourage/challenge, banned corporate words.",
      tokens: 58,
      clientId: "cl_demo",
      createdAt: iso(7),
    },
  ];

  const talent: TalentProfile[] = [
    {
      id: "tal_demo",
      clientId: "cl_demo",
      name: "Coach Reyes",
      persona: "Ex-pro sprinter turned trainer. Blunt, magnetic, slightly cocky but earns it.",
      delivery: "Talks fast, uses hands, films in the gym mid-set. Improvises — never reads.",
      doNots: "No scripted monologues. No reading from notes. No fake hype.",
      createdAt: iso(6),
    },
  ];

  const doctrines: Doctrine[] = [
    {
      id: "doc_demo",
      clientId: "cl_demo",
      name: "APEX Viral Hook Doctrine",
      framework:
        "1) Sub-2s hook from 4 archetypes (contrarian, number+stakes, transformation tease, named-enemy). 2) One idea per video. 3) Show, don't tell — open on motion/result. 4) End on an earned challenge, not a CTA. Voice = 80% encourage / 20% challenge.",
      createdAt: iso(6),
    },
  ];

  const boards: Board[] = [
    {
      id: "bd_demo",
      name: "APEX — Q3 Short-Form Sprint",
      clientId: "cl_demo",
      createdAt: iso(5),
      updatedAt: iso(1),
    },
  ];

  const nodes: BoardNode[] = [
    {
      id: "nd_1",
      boardId: "bd_demo",
      kind: "youtube",
      position: { x: -360, y: -120 },
      title: "Why 99% of athletes train wrong",
      sourceId: "src_yt_1",
      url: "https://www.youtube.com/watch?v=demo1",
      text: "Viral 12M-view video on training the wrong metrics.",
    },
    {
      id: "nd_2",
      boardId: "bd_demo",
      kind: "website",
      position: { x: -360, y: 140 },
      title: "Sprint mechanics study",
      sourceId: "src_web_1",
      url: "https://example.com/sprint-mechanics",
      text: "Ground-contact time + horizontal force drive acceleration.",
    },
    {
      id: "nd_3",
      boardId: "bd_demo",
      kind: "pdf",
      position: { x: -40, y: 320 },
      title: "APEX Brand Voice Bible.pdf",
      sourceId: "src_pdf_1",
      text: "Coach energy, 80/20 encourage/challenge.",
    },
    {
      id: "nd_4",
      boardId: "bd_demo",
      kind: "note",
      position: { x: 40, y: -160 },
      title: "Note",
      text: "Push the underdog-vs-elite angle. Founder loves it.",
    },
  ];

  const edges: BoardEdge[] = [];

  return { clients, sources, talent, doctrines, boards, nodes, edges };
}
