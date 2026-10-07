import { useAuth } from "@/lib/auth";
import { Button } from "./ui";

export function NotEditor() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Access
        </p>
        <h1 className="mt-3 font-serif text-4xl">Not on the editor list_</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          <span className="font-medium text-ink">{user?.email}</span> is signed in,
          but CMPLX has not added this address to the editors allowlist.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          There is no public signup. Contact CMPLX and ask them to add this email.
          An operator inserts it into{" "}
          <span className="font-mono text-xs">editors</span> and sends a Supabase
          Auth invite to the same address. Sign in again after that.
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          If the invite went to a different email, sign out and use that address.
        </p>
        <Button className="mt-6" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
