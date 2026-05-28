import { getStore } from "@/lib/store";
import { TopBar } from "@/components/Brand";
import { LibraryManager } from "@/components/LibraryManager";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const store = await getStore();
  const [sources, clients] = await Promise.all([
    store.sources.all(),
    store.clients.all(),
  ]);
  sources.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="min-h-screen">
      <TopBar />
      <section className="bloom relative border-b border-[var(--line)] surface-grid">
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <p className="label mb-3 text-[var(--text-muted)]">Content Brain</p>
          <h1 className="display text-5xl leading-none text-[var(--text)]">
            The <span className="text-chrome">brain</span>
          </h1>
          <p className="mt-3 max-w-xl text-[var(--text-dim)]">
            Every source you ingest becomes reusable, citable context — across every
            board and client.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <LibraryManager initialSources={sources} clients={clients} />
      </section>
    </main>
  );
}
