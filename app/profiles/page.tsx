import { getStore } from "@/lib/store";
import { TopBar } from "@/components/Brand";
import { ProfilesManager } from "@/components/ProfilesManager";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const store = await getStore();
  const [clients, talent, doctrines] = await Promise.all([
    store.clients.all(),
    store.talent.all(),
    store.doctrines.all(),
  ]);

  return (
    <main className="min-h-screen">
      <TopBar />
      <section className="bloom relative border-b border-[var(--line)] surface-grid">
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <p className="label mb-3 text-[var(--text-muted)]">Tuning</p>
          <h1 className="display text-5xl leading-none text-[var(--text)]">
            <span className="text-chrome">Voice</span> &amp; doctrine
          </h1>
          <p className="mt-3 max-w-xl text-[var(--text-dim)]">
            Onboard any client, define talent personas, and upload the framework the
            AI must pattern-match every output against.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <ProfilesManager
          initialClients={clients}
          initialTalent={talent}
          initialDoctrines={doctrines}
        />
      </section>
    </main>
  );
}
