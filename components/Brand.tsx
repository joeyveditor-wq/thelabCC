"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/cheatcode-logo.png"
        alt="CHEATCODE"
        width={2600}
        height={1212}
        priority
        className="h-7 w-auto transition-transform duration-200 group-hover:scale-[1.03]"
      />
      <span className="label text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
        / The Idea Lab
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="btn-ghost !px-3 !py-2"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? "◐ DARK" : "◑ LIGHT"}
    </button>
  );
}

const NAV = [
  { href: "/", label: "Clients" },
  { href: "/library", label: "Brain" },
];

export function TopBar({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-6 px-6">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active =
              n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`label rounded-full px-3 py-2 transition-colors ${
                  active
                    ? "text-[var(--text)] bg-[var(--bg-elevated)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
