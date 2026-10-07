import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, ErrorText } from "./ui";

export function EditorCheckFailed() {
  const { user, error, retryEditorCheck, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onRetry() {
    setBusy(true);
    try {
      await retryEditorCheck();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Access
        </p>
        <h1 className="mt-3 font-serif text-4xl">Couldn&apos;t confirm editor access_</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          <span className="font-medium text-ink">{user?.email}</span> is signed in,
          but the editors allowlist did not respond. Retry. If it keeps failing,
          contact CMPLX.
        </p>
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Button disabled={busy} onClick={() => void onRetry()}>
            Retry
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
