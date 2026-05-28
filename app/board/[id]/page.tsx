import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { TopBar } from "@/components/Brand";
import { BoardCanvas } from "@/components/canvas/BoardCanvas";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStore();
  const board = await store.boards.get(id);
  if (!board) notFound();

  const [nodes, edges, clients, talent, doctrines] = await Promise.all([
    store.nodes.all({ boardId: id }),
    store.edges.all({ boardId: id }),
    store.clients.all(),
    store.talent.all(),
    store.doctrines.all(),
  ]);
  const client = board.clientId ? await store.clients.get(board.clientId) : null;

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <TopBar
        right={
          <Link href="/" className="label text-[var(--text-muted)] hover:text-[var(--text)]">
            ← All boards
          </Link>
        }
      />
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-3">
        <h1 className="display text-lg text-[var(--text)]">{board.name}</h1>
        {client && (
          <span className="label rounded-full bg-chrome-soft px-3 py-1 text-[var(--text-dim)]">
            {client.name}
          </span>
        )}
        <span className="ml-auto label text-[var(--text-muted)]">
          {nodes.length} nodes
        </span>
      </div>
      <BoardCanvas
        board={board}
        nodes={nodes}
        edges={edges}
        client={client}
        clients={clients}
        talent={talent}
        doctrines={doctrines}
      />
    </main>
  );
}
