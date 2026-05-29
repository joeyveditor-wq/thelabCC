import { nanoid } from "nanoid";
import type { Board, BrainSource, ContentIdea, GenerationResult } from "./types";

interface GenInput {
  goal: string;
  sources: BrainSource[];
  board?: Board | null;
  count: number;
  /** Job-level instructions from fed Note nodes. */
  instructions?: string[];
  /** Per-source "use this for" map, keyed by source id. */
  sourceContext?: Record<string, string>;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

export async function generateIdeas(input: GenInput): Promise<GenerationResult> {
  const live = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
  const ideas = live ? await generateLive(input) : generateStub(input);

  return {
    id: nanoid(),
    goal: input.goal,
    ideas,
    sourceIds: input.sources.map((s) => s.id),
    sourceTitles: input.sources.map((s) => s.title),
    boardName: input.board?.name,
    model: live ? MODEL : "local-stub",
    grounded: input.sources.length > 0,
    createdAt: new Date().toISOString(),
  };
}

/* --------------------------------- live ----------------------------------- */

function buildSystem(input: GenInput): string {
  const parts: string[] = [
    "You are the generation engine inside The Idea Lab, a visual content-ideation workspace.",
    "You produce short-form video CONCEPTS — formats, hooks, and prompts to react to — NOT scripted dialogue. Talent improvise their own words.",
    'Ground every idea ONLY in the provided sources. In each idea\'s "citations" array, list the exact source TITLE string(s) it draws from — copy the title verbatim, with no "Source N:" prefix. Never invent facts not present in the sources.',
    "Output must be lean and scannable.",
  ];
  const b = input.board;
  if (b) {
    const brand: string[] = [`CLIENT: ${b.name}.`];
    if (b.tagline) brand.push(`Niche: ${b.tagline}.`);
    if (b.voice) brand.push(`Voice: ${b.voice}.`);
    if (b.audience) brand.push(`Audience: ${b.audience}.`);
    if (b.notes) brand.push(`Notes: ${b.notes}.`);
    if (b.framework)
      brand.push(
        `DOCTRINE${b.doctrineName ? " (" + b.doctrineName + ")" : ""} — every idea must pattern-match this framework: ${b.framework}`
      );
    if (b.referenceDoc)
      brand.push(
        "BRAND / VOICE REFERENCE (match this closely):\n" +
          b.referenceDoc.slice(0, 4000)
      );
    parts.push(brand.join(" "));
  }
  if (input.instructions && input.instructions.length) {
    parts.push(
      "JOB-LEVEL INSTRUCTIONS (the user pinned these as notes for this generation — honor them strictly):\n- " +
        input.instructions.map((s) => s.trim()).filter(Boolean).join("\n- ")
    );
  }
  parts.push(
    'Return ONLY valid JSON: {"ideas":[{"format":string,"concept":string,"hooks":string[3-5],"prompts":string[2-4],"whyItWorks":string,"citations":string[],"variants":[{"label":string,"twist":string}]}]}'
  );
  return parts.join("\n\n");
}

async function generateLive(input: GenInput): Promise<ContentIdea[]> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const ctx = input.sourceContext ?? {};
  const sourceBlock = input.sources
    .map((s) => {
      const useFor = ctx[s.id]?.trim();
      const head = `TITLE: ${s.title}\nTYPE: ${s.kind}`;
      const hint = useFor ? `\nUSE THIS FOR (user's instruction for THIS source): ${useFor}` : "";
      return `${head}${hint}\nCONTENT: ${s.content}`;
    })
    .join("\n\n---\n\n");

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: buildSystem(input),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `SOURCES (the content brain):\n\n${sourceBlock}\n\nGOAL: ${input.goal}\n\nGenerate ${input.count} distinct concepts as JSON.`,
      },
    ],
  });

  const text = msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");

  const json = extractJson(text);
  if (json?.ideas?.length) return json.ideas as ContentIdea[];
  // fall back to a grounded stub if parsing fails
  return generateStub(input);
}

function extractJson(text: string): { ideas: ContentIdea[] } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* --------------------------------- stub ----------------------------------- */
/* Deterministic, grounded output so the engine works without an API key.
   Pulls real angles from the selected source summaries so citations are honest. */

const FORMATS = [
  "Talking-head cold open",
  "Split-screen myth vs. reality",
  "POV mid-set, no cuts",
  "Whiteboard breakdown (60s)",
  "Stitch / duet reaction",
  "Day-in-the-life montage",
];

const HOOK_TEMPLATES = [
  (s: string) => `"99% of people get ${low(s)} completely wrong."`,
  (s: string) => `"This one change to ${low(s)} beats months of grinding."`,
  (s: string) => `"Stop doing ${low(s)} until you watch this."`,
  (s: string) => `"The ${low(s)} thing nobody films — but everyone should."`,
  (s: string) => `"I tested ${low(s)} for 8 weeks. The numbers don't lie."`,
];

function low(s: string): string {
  return s.replace(/\.$/, "").toLowerCase();
}

function topicFrom(source: BrainSource | undefined, goal: string): string {
  if (source) {
    const base = source.summary || source.title;
    return base.split(/[.;:]/)[0].slice(0, 70);
  }
  return goal.slice(0, 60);
}

function generateStub(input: GenInput): ContentIdea[] {
  const { sources, count, board } = input;
  const ideas: ContentIdea[] = [];
  const n = Math.max(1, Math.min(count, 6));

  for (let i = 0; i < n; i++) {
    const primary = sources[i % Math.max(sources.length, 1)];
    const secondary = sources[(i + 1) % Math.max(sources.length, 1)];
    const topic = topicFrom(primary, input.goal);
    const format = FORMATS[i % FORMATS.length];

    const hooks = HOOK_TEMPLATES.slice(0, 4).map((t) => t(topic));

    const citations = [primary, secondary]
      .filter((s): s is BrainSource => !!s)
      .map((s) => s.title)
      .filter((v, idx, arr) => arr.indexOf(v) === idx);

    const why = board?.framework
      ? `Opens in under 2s with a ${i % 2 === 0 ? "contrarian claim" : "number + stakes"} hook — matches "${board.doctrineName || "the doctrine"}". One idea, shown not told.${board.voice ? " Voice stays " + low(board.voice.split(".")[0]) + "." : ""}`
      : `Leads with a curiosity gap and a concrete payoff drawn from the source, so viewers stay past the 3s bounce point.`;

    ideas.push({
      format,
      concept: `${cap(topic)} — reframed as a ${format.toLowerCase()}. ${
        primary ? `Anchored on the claim from "${primary.title}".` : ""
      } Talent reacts live; no script.`,
      hooks,
      prompts: [
        `React to: "${topic}". What's the one thing people refuse to believe?`,
        `On camera, show the result first — then explain how you got there.`,
        secondary
          ? `Tie it back to "${secondary.title}" with a single number.`
          : `Name the enemy: what myth are we killing today?`,
      ].filter(Boolean) as string[],
      whyItWorks: why,
      citations,
      variants: [
        { label: "Shorter", twist: "Cut to a 15s version — hook + single proof + challenge." },
        { label: "Series", twist: `Spin into a 3-part series, one ${low(topic)} myth per episode.` },
      ],
    });
  }
  return ideas;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
