import Link from "next/link";
import { getStore, isMemoryStore } from "@/lib/store";
import { TopBar } from "@/components/Brand";
import { NewClient } from "@/components/NewBoard";
import { BoardCard } from "@/components/BoardCard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const store = await getStore();
  const [boards, sources] = await Promise.all([
    store.boards.all(),
    store.sources.all(),
  ]);
  boards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const nodeCounts = await Promise.all(
    boards.map((b) => store.nodes.all({ boardId: b.id }).then((n) => n.length))
  );
  const sourceCounts = await Promise.all(
    boards.map((b) => store.sources.all({ boardId: b.id }).then((s) => s.length))
  );

  return (
    <main className="min-h-screen">
      <TopBar right={<NewClient />} />

      {/* hero */}
      <section className="bloom relative overflow-hidden border-b border-[var(--line)] surface-grid">
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <p className="label mb-4 text-[var(--text-muted)]">
            Marketing • Content Strategy • Production • Hosting
          </p>
          <h1 className="display max-w-3xl text-6xl leading-[0.9] sm:text-7xl">
            <span className="text-[var(--text)]">A workspace per </span>
            <span className="text-chrome text-chrome-anim inline-block pr-[0.22em] -mr-[0.18em] align-baseline">
              client
            </span>
            <span className="text-[var(--text)]">. Concepts on tap.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-dim)]">
            Each client gets their own board. Drop their sources — PDFs, links,
            videos, notes — and the AI generates concepts in their voice, grounded
            only in what you loaded.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <NewClient />
            <Link href="/library" className="btn-ghost">
              Open the brain
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-8">
            <Stat value={boards.length} label="Clients" />
            <Stat value={sources.length} label="Brain sources" />
            <Stat
              value={boards.reduce((a, _, i) => a + nodeCounts[i], 0)}
              label="Canvas nodes"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="display text-3xl text-[var(--text)]">Clients</h2>
          {isMemoryStore() && (
            <span className="label rounded-full border border-[var(--line-strong)] px-3 py-1 text-[var(--text-muted)]">
              ◌ In-memory demo · set MONGODB_URI to persist
            </span>
          )}
        </div>

        {boards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line-strong)] p-16 text-center">
            <p className="text-[var(--text-muted)]">No clients yet.</p>
            <div className="mt-4 inline-block">
              <NewClient />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b, i) => (
              <BoardCard
                key={b.id}
                board={b}
                sourceCount={sourceCounts[i]}
                nodeCount={nodeCounts[i]}
                index={i}
              />
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
