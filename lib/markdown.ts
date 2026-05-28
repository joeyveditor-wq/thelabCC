import type { ContentIdea, GenerationResult } from "./types";

export function ideaToMarkdown(idea: ContentIdea, index?: number): string {
  const lines: string[] = [];
  lines.push(`### ${index !== undefined ? `${index + 1}. ` : ""}${idea.format}`);
  lines.push("");
  lines.push(idea.concept);
  lines.push("");
  lines.push("**Hooks**");
  idea.hooks.forEach((h) => lines.push(`- ${h}`));
  lines.push("");
  lines.push("**Prompts / questions**");
  idea.prompts.forEach((p) => lines.push(`- ${p}`));
  lines.push("");
  lines.push(`**Why it works:** ${idea.whyItWorks}`);
  if (idea.variants.length) {
    lines.push("");
    lines.push("**Variants**");
    idea.variants.forEach((v) => lines.push(`- _${v.label}:_ ${v.twist}`));
  }
  if (idea.citations.length) {
    lines.push("");
    lines.push(`**Sources:** ${idea.citations.join(", ")}`);
  }
  return lines.join("\n");
}

export function resultToMarkdown(result: GenerationResult): string {
  const head = [
    `# ${result.goal}`,
    "",
    `> Generated ${new Date(result.createdAt).toLocaleString()} · model: ${result.model} · ${
      result.grounded ? "grounded in " + result.sourceTitles.length + " source(s)" : "ungrounded"
    }`,
    result.sourceTitles.length
      ? `> Brain: ${result.sourceTitles.join(" · ")}`
      : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");
  const body = result.ideas.map((i, idx) => ideaToMarkdown(i, idx)).join("\n\n---\n\n");
  return `${head}\n${body}\n`;
}
