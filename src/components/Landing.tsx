import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Banner, Button, ErrorText, Field, fieldControlClass } from "./ui";

export function Landing() {
  const { mode, signInWithPassword, sendMagicLink, enterDemo, error, notice } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLocalError(null);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onMagic() {
    setBusy(true);
    setLocalError(null);
    try {
      await sendMagicLink(email);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not send magic link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-16 px-6 py-16 lg:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/55">
            CMPLX iT · Editors only
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Project statuses and design briefs, as a system of record_
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-paper/75">
            Smarter systems. Simpler spaces. Status lives here — not in chat
            threads or a spreadsheet someone stopped updating.
          </p>
        </div>

        <div className="rounded-sm border border-white/10 bg-paper p-6 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-8">
          <h2 className="font-serif text-3xl">Sign in</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Email/password or a magic link. You must be on the{" "}
            <span className="font-mono text-xs">editors</span> allowlist.
          </p>

          {mode === "demo" ? (
            <div className="mt-5 space-y-3">
              <Banner tone="warn">
                No Supabase env configured. This workspace uses clearly labeled
                DEMO seed data in local storage.
              </Banner>
              <Button type="button" className="w-full" onClick={enterDemo}>
                Enter demo workspace
              </Button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onPassword}>
              <Field label="Email">
                <input
                  className={fieldControlClass}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field label="Password" hint="Leave blank if you only want a magic link.">
                <input
                  className={fieldControlClass}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={busy || !password} className="flex-1">
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || !email}
                  onClick={() => void onMagic()}
                  className="flex-1"
                >
                  Send magic link
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 space-y-2">
            <ErrorText>{localError || error}</ErrorText>
            {notice ? <Banner tone="ok">{notice}</Banner> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
