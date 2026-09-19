import { useAuth } from "@/lib/auth";
import { Button } from "./ui";

export function NotEditor() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Access
        </p>
        <h1 className="mt-3 font-serif text-4xl">Not on the editor list_</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          <span className="font-medium text-ink">{user?.email}</span> signed in,
          but is not in the <span className="font-mono text-xs">editors</span>{" "}
          allowlist. Ask a CMPLX admin to add the row, then sign in again.
        </p>
        <Button className="mt-6" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
