import Link from "next/link";
import { getStore, isMemoryStore } from "@/lib/store";
import { TopBar } from "@/components/Brand";
import { NewBoard } from "@/components/NewBoard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const store = await getStore();
  const [boards, clients, sources] = await Promise.all([
    store.boards.all(),
    store.clients.all(),
    store.sources.all(),
  ]);
  boards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const clientName = (id?: string) =>
    clients.find((c) => c.id === id)?.name ?? "Unassigned";

  const nodeCounts = await Promise.all(
    boards.map((b) => store.nodes.all({ boardId: b.id }).then((n) => n.length))
  );

  return (
    <main className="min-h-screen">
      <TopBar right={<NewBoard clients={clients} />} />

      {/* hero */}
      <section className="bloom relative overflow-hidden border-b border-[var(--line)] surface-grid">
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <p className="label mb-4 text-[var(--text-muted)]">
            Marketing • Content Strategy • Production • Hosting
          </p>
          <h1 className="display max-w-3xl text-6xl leading-[0.9] sm:text-7xl">
            <span className="text-[var(--text)]">Arrange a </span>
            <span className="text-chrome text-chrome-anim inline-block pr-[0.14em] -mr-[0.12em] align-baseline">
              creative brain
            </span>
            <span className="text-[var(--text)]">, not a chat box.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-dim)]">
            Drag your PDFs, links, videos and notes onto an infinite canvas. The AI
            ingests everything as context, then generates content concepts grounded
            only in what you loaded — and cites it back.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <NewBoard clients={clients} />
            <Link href="/library" className="btn-ghost">
              Open the brain
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-8">
            <Stat value={boards.length} label="Boards" />
            <Stat value={sources.length} label="Brain sources" />
            <Stat value={clients.length} label="Clients" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="display text-3xl text-[var(--text)]">Boards</h2>
          {isMemoryStore() && (
            <span className="label rounded-full border border-[var(--line-strong)] px-3 py-1 text-[var(--text-muted)]">
              ◌ In-memory demo · set MONGODB_URI to persist
            </span>
          )}
        </div>

        {boards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line-strong)] p-16 text-center">
            <p className="text-[var(--text-muted)]">No boards yet.</p>
            <div className="mt-4 inline-block">
              <NewBoard clients={clients} />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b, i) => (
              <Link
                key={b.id}
                href={`/board/${b.id}`}
                className="group animate-rise-in relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--bg-raised)] p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-glow"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="surface-grid-fine pointer-events-none absolute inset-0 opacity-40" />
                <div className="relative">
                  <div className="mb-8 flex items-center justify-between">
                    <span className="label rounded-full bg-chrome-soft px-3 py-1 text-[var(--text-dim)]">
                      {clientName(b.clientId)}
                    </span>
                    <span className="label text-[var(--text-muted)]">
                      {nodeCounts[i]} nodes
                    </span>
                  </div>
                  <h3 className="display text-2xl leading-tight text-[var(--text)] transition-colors group-hover:text-chrome">
                    {b.name}
                  </h3>
                  <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">
                    Updated {new Date(b.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="chrome-rule mt-5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="display text-4xl text-chrome">{value}</p>
      <p className="label mt-1 text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
