"use client";

import { useState } from "react";
import type { GenerationResult } from "@/lib/types";
import { copyText, exportToGoogleDoc } from "@/lib/client";
import { ideaToMarkdown, resultToMarkdown } from "@/lib/markdown";

export function OutputCard({
  result,
  onClose,
  onRegenerate,
}: {
  result: GenerationResult;
  onClose?: () => void;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-4 border-b border-[var(--line)] p-5">
        <div className="min-w-0 flex-1">
          <p className="label mb-2 text-cc-magenta">Concepts</p>
          <h2 className="font-sans text-[17px] font-semibold leading-snug text-[var(--text)]">
            {result.goal}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tag>{result.ideas.length} concepts</Tag>
            <Tag>{result.grounded ? "grounded" : "ungrounded"}</Tag>
            {result.sourceTitles.map((t) => (
              <Tag key={t} accent>
                {t}
              </Tag>
            ))}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-ghost !px-3 !py-2">
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-3">
        <button
          className="btn-ghost"
          onClick={async () => {
            if (await copyText(resultToMarkdown(result))) flash("all");
          }}
        >
          {copied === "all" ? "✓ Copied" : "Copy all"}
        </button>
        <button
          className="btn-ghost"
          onClick={async () => {
            const ok = await exportToGoogleDoc(resultToMarkdown(result));
            if (ok) flash("doc");
          }}
        >
          {copied === "doc" ? "✓ Copied · paste in the new doc" : "Export to Google Doc"}
        </button>
        {onRegenerate && (
          <button className="btn-chrome ml-auto" onClick={onRegenerate}>
            ↻ Regenerate
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {result.ideas.map((idea, i) => (
          <article
            key={i}
            className="animate-rise-in rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-raised)] p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="display text-lg text-chrome">{idea.format}</h3>
              <button
                className="label text-[var(--text-muted)] hover:text-[var(--text)]"
                onClick={async () => {
                  if (await copyText(ideaToMarkdown(idea))) flash(`i${i}`);
                }}
              >
                {copied === `i${i}` ? "✓" : "Copy"}
              </button>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {idea.concept}
            </p>

            <Section title="Hooks">
              <ul className="space-y-1.5">
                {idea.hooks.map((h, hi) => (
                  <li
                    key={hi}
                    className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[13px] italic text-[var(--text)]"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Prompts to react to">
              <ul className="space-y-1">
                {idea.prompts.map((p, pi) => (
                  <li key={pi} className="flex gap-2 text-[13px] text-[var(--text-dim)]">
                    <span className="text-cc-amber">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Why it works">
              <p className="text-[13px] leading-relaxed text-[var(--text-dim)]">
                {idea.whyItWorks}
              </p>
            </Section>

            {idea.variants.length > 0 && (
              <Section title="Variants">
                <div className="flex flex-wrap gap-2">
                  {idea.variants.map((v, vi) => (
                    <span
                      key={vi}
                      className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[12px] text-[var(--text-dim)]"
                    >
                      <span className="font-semibold text-[var(--text)]">{v.label}:</span>{" "}
                      {v.twist}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {idea.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-2.5">
                <span className="label text-[var(--text-muted)]">From:</span>
                {idea.citations.map((c) => (
                  <Tag key={c} accent>
                    {c}
                  </Tag>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="label mb-1.5 text-[var(--text-muted)]">{title}</p>
      {children}
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className="label rounded-full px-2 py-0.5"
      style={{
        border: `1px solid ${accent ? "#8A2BE2" : "var(--line-strong)"}`,
        color: accent ? "#FF7AA2" : "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}
