import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Banner, Button, ErrorText, Field, fieldControlClass } from "./ui";

type Method = "link" | "password";

export function Landing() {
  const {
    mode,
    signInWithPassword,
    sendMagicLink,
    sendPasswordReset,
    enterDemo,
    error,
    notice,
    linkError,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<Method>(linkError ? "link" : "password");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setLocalError(null);
    try {
      await action();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function onPassword(event: FormEvent) {
    event.preventDefault();
    void run(() => signInWithPassword(email, password));
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
          <p className="mt-4 max-w-md text-sm leading-7 text-paper/60">
            CMPLX sends the invite. There is no public signup. Open the email
            link, or come back here if it expired.
          </p>
        </div>

        <div className="rounded-sm border border-white/10 bg-paper p-6 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-8">
          <h2 className="font-serif text-3xl">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Invited, or the link expired? Use an email link. Already chose a
            password? Sign in with it. Your address must be on the{" "}
            <span className="font-mono text-xs">editors</span> allowlist.
          </p>

          {mode === "demo" ? (
            <div className="mt-5 space-y-3">
              <Banner tone="warn">
                No Supabase env configured. This browser is using labeled demo
                data. Live editors sign in on the deployed app.
              </Banner>
              <Button type="button" className="w-full" onClick={enterDemo}>
                Enter demo workspace
              </Button>
            </div>
          ) : (
            <>
              {linkError ? (
                <div className="mt-5">
                  <Banner tone="warn">{linkError}</Banner>
                </div>
              ) : null}

              <div
                className="mt-6 grid grid-cols-2 gap-1 rounded-sm bg-paper-2 p-1"
                role="group"
                aria-label="Sign-in method"
              >
                <button
                  type="button"
                  aria-pressed={method === "link"}
                  className={
                    method === "link"
                      ? "rounded-sm bg-white px-3 py-2 text-sm font-medium text-ink"
                      : "rounded-sm px-3 py-2 text-sm text-ink-soft"
                  }
                  onClick={() => setMethod("link")}
                >
                  Email link
                </button>
                <button
                  type="button"
                  aria-pressed={method === "password"}
                  className={
                    method === "password"
                      ? "rounded-sm bg-white px-3 py-2 text-sm font-medium text-ink"
                      : "rounded-sm px-3 py-2 text-sm text-ink-soft"
                  }
                  onClick={() => setMethod("password")}
                >
                  Password
                </button>
              </div>

              {method === "link" ? (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(() => sendMagicLink(email));
                  }}
                >
                  <Field
                    label="Email"
                    hint="Use the address CMPLX invited. Email links only work for an existing Auth user."
                  >
                    <input
                      className={fieldControlClass}
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" disabled={busy || !email} className="w-full">
                    Email me a sign-in link
                  </Button>
                </form>
              ) : (
                <form className="mt-4 space-y-4" onSubmit={onPassword}>
                  <Field label="Email">
                    <input
                      className={fieldControlClass}
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      className={fieldControlClass}
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" disabled={busy || !password} className="w-full">
                    Sign in
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink disabled:opacity-50"
                    disabled={busy || !email}
                    onClick={() => void run(() => sendPasswordReset(email))}
                  >
                    Forgot password? Email me a reset link
                  </button>
                  {!email ? (
                    <p className="text-xs text-ink-soft">
                      Enter your email to request a reset link.
                    </p>
                  ) : null}
                </form>
              )}
            </>
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
