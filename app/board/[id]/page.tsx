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

  const [nodes, edges, history] = await Promise.all([
    store.nodes.all({ boardId: id }),
    store.edges.all({ boardId: id }),
    store.history.all({ boardId: id }),
  ]);
  history.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <TopBar
        right={
          <Link href="/" className="label text-[var(--text-muted)] hover:text-[var(--text)]">
            ← All clients
          </Link>
        }
      />
      <BoardCanvas
        board={board}
        nodes={nodes}
        edges={edges}
        history={history}
      />
    </main>
  );
}
