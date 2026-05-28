import Link from "next/link";
import { TopBar } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="min-h-screen">
      <TopBar />
      <div className="bloom relative grid min-h-[70vh] place-items-center surface-grid">
        <div className="relative text-center">
          <p className="display text-8xl text-chrome">404</p>
          <p className="mt-2 text-[var(--text-muted)]">
            This board slipped off the canvas.
          </p>
          <Link href="/" className="btn-chrome mt-6 inline-block">
            ← Back to boards
          </Link>
        </div>
      </div>
    </main>
  );
}
