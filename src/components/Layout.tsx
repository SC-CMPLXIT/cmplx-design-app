import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui";

export function Layout({ children }: { children: ReactNode }) {
  const { user, mode, signOut, resetDemo } = useAuth();

  return (
    <div className="min-h-screen">
      {mode === "demo" ? (
        <div className="no-print border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
          Demo mode — labeled seed data in this browser only. Set{" "}
          <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
          <span className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</span> to use
          live Auth + Postgres.
          <button
            type="button"
            className="ml-3 underline underline-offset-2"
            onClick={resetDemo}
          >
            Reset demo data
          </button>
        </div>
      ) : null}

      <header className="no-print border-b border-rule bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/projects" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl tracking-tight">CMPLX iT</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/70">
              Design_
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <NavLink
              to="/projects"
              className={({ isActive }) =>
                isActive ? "text-paper" : "text-paper/70 hover:text-paper"
              }
            >
              Projects
            </NavLink>
            <span className="hidden font-mono text-[11px] text-paper/55 sm:inline">
              {user?.email}
            </span>
            <Button
              variant="paper"
              className="bg-paper/10 text-paper hover:bg-paper/20"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
