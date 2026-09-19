import { FormEvent, useState } from "react";
import { formatDateTime } from "@/lib/dates";
import type { StatusUpdate } from "@/lib/types";
import { Button, EmptyState, Field, fieldControlClass } from "./ui";

export function StatusNotes({
  updates,
  onAdd,
}: {
  updates: StatusUpdate[];
  onAdd: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(body);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-3xl">Status notes_</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Dated stream. The project row still holds the current status pill.
      </p>

      <form className="mt-4 rounded-sm border border-rule bg-white p-4" onSubmit={onSubmit}>
        <Field label="New note">
          <textarea
            className={`${fieldControlClass} min-h-24`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What changed, what’s blocked, what happens next."
            required
          />
        </Field>
        {error ? <p className="mt-2 text-sm text-rose-800">{error}</p> : null}
        <Button type="submit" className="mt-3" disabled={busy}>
          Add note
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        {updates.length === 0 ? (
          <EmptyState
            title="No notes yet"
            body="Add the first dated status note so the current pill has a trail."
          />
        ) : (
          updates.map((update) => (
            <article key={update.id} className="rounded-sm border border-rule bg-white px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                {formatDateTime(update.created_at)} · {update.author}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{update.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
