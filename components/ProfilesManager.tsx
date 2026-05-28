"use client";

import { useRef, useState } from "react";
import type { ClientProfile, Doctrine, TalentProfile } from "@/lib/types";
import { api, parseFile } from "@/lib/client";

type Tab = "clients" | "talent" | "doctrines";

export function ProfilesManager({
  initialClients,
  initialTalent,
  initialDoctrines,
}: {
  initialClients: ClientProfile[];
  initialTalent: TalentProfile[];
  initialDoctrines: Doctrine[];
}) {
  const [tab, setTab] = useState<Tab>("clients");
  const [clients, setClients] = useState(initialClients);
  const [talent, setTalent] = useState(initialTalent);
  const [doctrines, setDoctrines] = useState(initialDoctrines);

  return (
    <div>
      <div className="mb-8 flex gap-1.5">
        {(
          [
            ["clients", "Clients"],
            ["talent", "Talent"],
            ["doctrines", "Doctrine"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`label rounded-full px-4 py-2 transition-colors ${
              tab === t
                ? "bg-chrome text-black"
                : "border border-[var(--line-strong)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "clients" && (
        <ClientSection clients={clients} setClients={setClients} />
      )}
      {tab === "talent" && (
        <TalentSection talent={talent} setTalent={setTalent} clients={clients} />
      )}
      {tab === "doctrines" && (
        <DoctrineSection
          doctrines={doctrines}
          setDoctrines={setDoctrines}
          clients={clients}
        />
      )}
    </div>
  );
}

/* ------------------------------- shared bits ------------------------------ */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <article className="animate-rise-in rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-raised)] p-5">
      {children}
    </article>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}

/** Upload a PDF/DOCX/TXT and hand back the extracted text. */
function PdfUpload({
  onParsed,
  hint = "Upload PDF",
}: {
  onParsed: (r: { title: string; text: string }) => void;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await parseFile(file);
      if (!r.text) setErr("No text found in that file.");
      else onParsed(r);
    } catch {
      setErr("Couldn't read that file.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:border-cc-magenta hover:text-[var(--text)] disabled:opacity-50"
      >
        <span className="text-cc-magenta">⬆</span>
        {busy ? "Extracting…" : hint}
      </button>
      {err && <p className="mt-1 text-[11px] text-cc-coral">{err}</p>}
      <input
        ref={ref}
        type="file"
        accept=".pdf,application/pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

/* -------------------------------- clients --------------------------------- */

function ClientSection({
  clients,
  setClients,
}: {
  clients: ClientProfile[];
  setClients: (v: ClientProfile[]) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    niche: "",
    voice: "",
    audience: "",
    notes: "",
    referenceDoc: "",
  });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const c = await api<ClientProfile>("/api/clients", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setClients([...clients, c]);
      setForm({ name: "", niche: "", voice: "", audience: "", notes: "", referenceDoc: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <h3 className="display mb-4 text-xl text-[var(--text)]">New client</h3>
        <div className="space-y-3">
          <Labeled label="Name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Labeled>
          <Labeled label="Niche">
            <input className="input" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
          </Labeled>
          <Labeled label="Brand voice">
            <textarea className="input resize-none" rows={2} value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} />
          </Labeled>
          <Labeled label="Audience">
            <input className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </Labeled>
          <Labeled label="Brand / voice doc (optional)">
            <PdfUpload
              hint="Upload brand PDF"
              onParsed={(r) =>
                setForm((f) => ({
                  ...f,
                  referenceDoc: r.text,
                  name: f.name.trim() || r.title,
                }))
              }
            />
            {form.referenceDoc && (
              <textarea
                className="input mt-2 resize-none font-mono text-[11px]"
                rows={4}
                value={form.referenceDoc}
                onChange={(e) => setForm({ ...form, referenceDoc: e.target.value })}
              />
            )}
          </Labeled>
          <button className="btn-chrome w-full disabled:opacity-50" disabled={busy} onClick={create}>
            {busy ? "Saving…" : "Add client"}
          </button>
        </div>
      </Card>

      <div className="grid content-start gap-4 sm:grid-cols-2">
        {clients.map((c) => (
          <Card key={c.id}>
            <h4 className="display text-lg text-chrome">{c.name}</h4>
            <p className="mt-1 text-[13px] text-[var(--text-dim)]">{c.niche}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
              <span className="label text-[var(--text-muted)]">Voice · </span>
              {c.voice}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
              <span className="label text-[var(--text-muted)]">Audience · </span>
              {c.audience}
            </p>
            {c.referenceDoc && (
              <span className="label mt-3 inline-flex items-center gap-1.5 rounded-full bg-chrome-soft px-2.5 py-1 text-[var(--text-dim)]">
                ▤ Brand doc attached
              </span>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- talent --------------------------------- */

function TalentSection({
  talent,
  setTalent,
  clients,
}: {
  talent: TalentProfile[];
  setTalent: (v: TalentProfile[]) => void;
  clients: ClientProfile[];
}) {
  const [form, setForm] = useState({ name: "", persona: "", delivery: "", doNots: "", clientId: "" });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const t = await api<TalentProfile>("/api/talent", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setTalent([...talent, t]);
      setForm({ name: "", persona: "", delivery: "", doNots: "", clientId: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <h3 className="display mb-4 text-xl text-[var(--text)]">New talent</h3>
        <div className="space-y-3">
          <Labeled label="Name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Labeled>
          <Labeled label="Persona">
            <textarea className="input resize-none" rows={2} value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} />
          </Labeled>
          <Labeled label="Delivery">
            <textarea className="input resize-none" rows={2} value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })} />
          </Labeled>
          <Labeled label="Do NOT">
            <input className="input" value={form.doNots} onChange={(e) => setForm({ ...form, doNots: e.target.value })} />
          </Labeled>
          <Labeled label="Client">
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Any</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Labeled>
          <button className="btn-chrome w-full disabled:opacity-50" disabled={busy} onClick={create}>
            {busy ? "Saving…" : "Add talent"}
          </button>
        </div>
      </Card>

      <div className="grid content-start gap-4 sm:grid-cols-2">
        {talent.map((t) => (
          <Card key={t.id}>
            <h4 className="display text-lg text-chrome">{t.name}</h4>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{t.persona}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
              <span className="label">Delivery · </span>{t.delivery}
            </p>
            {t.doNots && (
              <p className="mt-2 text-[13px] text-cc-coral">✕ {t.doNots}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- doctrine -------------------------------- */

function DoctrineSection({
  doctrines,
  setDoctrines,
  clients,
}: {
  doctrines: Doctrine[];
  setDoctrines: (v: Doctrine[]) => void;
  clients: ClientProfile[];
}) {
  const [form, setForm] = useState({ name: "", framework: "", clientId: "" });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.name.trim() || !form.framework.trim()) return;
    setBusy(true);
    try {
      const d = await api<Doctrine>("/api/doctrines", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setDoctrines([...doctrines, d]);
      setForm({ name: "", framework: "", clientId: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <h3 className="display mb-4 text-xl text-[var(--text)]">New doctrine</h3>
        <div className="space-y-3">
          <Labeled label="Name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Labeled>
          <Labeled label="Framework — the AI pattern-matches every output to this">
            <PdfUpload
              hint="Upload framework PDF"
              onParsed={(r) =>
                setForm((f) => ({
                  ...f,
                  framework: r.text,
                  name: f.name.trim() || r.title,
                }))
              }
            />
            <textarea
              className="input mt-2 resize-none"
              rows={6}
              placeholder="…or type/paste the framework"
              value={form.framework}
              onChange={(e) => setForm({ ...form, framework: e.target.value })}
            />
          </Labeled>
          <Labeled label="Client">
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Any</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Labeled>
          <button className="btn-chrome w-full disabled:opacity-50" disabled={busy} onClick={create}>
            {busy ? "Saving…" : "Add doctrine"}
          </button>
        </div>
      </Card>

      <div className="grid content-start gap-4">
        {doctrines.map((d) => (
          <Card key={d.id}>
            <h4 className="display text-lg text-chrome">{d.name}</h4>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-muted)]">
              {d.framework}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
