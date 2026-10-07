import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, ErrorText, Field, fieldControlClass } from "./ui";

export function SetPassword() {
  const { user, setPassword, signOut } = useAuth();
  const [password, setPasswordValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await setPassword(password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not save the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Password reset
        </p>
        <h1 className="mt-3 font-serif text-4xl">Set a new password_</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          This reset link signed in{" "}
          <span className="font-medium text-ink">{user?.email}</span>. Choose a
          password for next time, then continue to projects. If you leave, request
          another reset from the sign-in page.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label="New password" hint="At least 8 characters.">
            <input
              className={fieldControlClass}
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPasswordValue(event.target.value)}
            />
          </Field>
          <Field label="Confirm password">
            <input
              className={fieldControlClass}
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </Field>
          <ErrorText>{localError}</ErrorText>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy} className="flex-1">
              Save password
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
