import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TECHNOLOGY_CATEGORIES } from "@/lib/categories";
import { api } from "@/lib/api";
import type { NarrativeDraft, ProjectSpace, ScopeItem, SpaceSystemNarrative } from "@/lib/types";
import { Button, EmptyState, ErrorText, Field, fieldControlClass } from "./ui";

const OVERVIEW_KEY = "__overview__";

type SpaceForm = {
  name: string;
  note: string;
  bodies: Record<string, string>;
};

type NarrativeRow = {
  category_key: string | null;
  label: string;
  outOfScope: boolean;
};

function keyOf(categoryKey: string | null) {
  return categoryKey ?? OVERVIEW_KEY;
}

function categoryLabel(categoryKey: string, scopeItems: ScopeItem[]) {
  return (
    scopeItems.find((item) => item.category_key === categoryKey)?.category_name ??
    TECHNOLOGY_CATEGORIES.find((item) => item.key === categoryKey)?.name ??
    categoryKey
  );
}

function formsFrom(
  spaces: ProjectSpace[],
  narratives: SpaceSystemNarrative[],
): Record<string, SpaceForm> {
  const forms: Record<string, SpaceForm> = {};
  for (const space of spaces) {
    const bodies: Record<string, string> = {};
    for (const row of narratives) {
      if (row.space_id !== space.id) continue;
      bodies[keyOf(row.category_key)] = row.body;
    }
    forms[space.id] = { name: space.name, note: space.note, bodies };
  }
  return forms;
}

function rowsForSpace(
  spaceId: string,
  scopeItems: ScopeItem[],
  narratives: SpaceSystemNarrative[],
  form: SpaceForm | undefined,
): NarrativeRow[] {
  const inScope = scopeItems
    .filter((item) => item.in_scope)
    .sort((a, b) => a.sort_order - b.sort_order);
  const inKeys = new Set(inScope.map((item) => item.category_key));
  const extraKeys = new Set<string>();

  for (const row of narratives) {
    if (row.space_id === spaceId && row.category_key && !inKeys.has(row.category_key)) {
      extraKeys.add(row.category_key);
    }
  }
  if (form) {
    for (const [key, body] of Object.entries(form.bodies)) {
      if (key !== OVERVIEW_KEY && !inKeys.has(key) && body.trim()) extraKeys.add(key);
    }
  }

  const extras = [...extraKeys]
    .sort((a, b) => categoryLabel(a, scopeItems).localeCompare(categoryLabel(b, scopeItems)))
    .map((key) => ({
      category_key: key,
      label: categoryLabel(key, scopeItems),
      outOfScope: true,
    }));

  return [
    { category_key: null, label: "Overview", outOfScope: false },
    ...inScope.map((item) => ({
      category_key: item.category_key,
      label: item.category_name,
      outOfScope: false,
    })),
    ...extras,
  ];
}

function draftsFor(
  spaceId: string,
  rows: NarrativeRow[],
  form: SpaceForm,
  narratives: SpaceSystemNarrative[],
): NarrativeDraft[] {
  return rows.flatMap((row) => {
    const body = form.bodies[keyOf(row.category_key)] ?? "";
    const exists = narratives.some(
      (item) => item.space_id === spaceId && item.category_key === row.category_key,
    );
    if (!exists && !body.trim()) return [];
    return [{ category_key: row.category_key, body }];
  });
}

export function SystemNarrative({
  projectId,
  scopeItems,
  mode,
  narrativeHref = null,
}: {
  projectId: string;
  scopeItems: ScopeItem[];
  mode: "edit" | "summary";
  narrativeHref?: string | null;
}) {
  const [spaces, setSpaces] = useState<ProjectSpace[]>([]);
  const [narratives, setNarratives] = useState<SpaceSystemNarrative[]>([]);
  const [forms, setForms] = useState<Record<string, SpaceForm>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const actionLock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const bundle = await api.getSpaceBundle(projectId);
        if (cancelled) return;
        const ordered = [...bundle.spaces].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
        setSpaces(ordered);
        setNarratives(bundle.narratives);
        setForms(formsFrom(ordered, bundle.narratives));
        setOpenId((current) =>
          current && ordered.some((space) => space.id === current)
            ? current
            : (ordered[0]?.id ?? null),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load spaces.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const ordered = useMemo(
    () =>
      [...spaces].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      ),
    [spaces],
  );

  function patchForm(spaceId: string, patch: Partial<SpaceForm>) {
    setForms((current) => {
      const existing = current[spaceId];
      if (!existing) return current;
      return { ...current, [spaceId]: { ...existing, ...patch } };
    });
  }

  function patchBody(spaceId: string, categoryKey: string | null, body: string) {
    setForms((current) => {
      const existing = current[spaceId];
      if (!existing) return current;
      return {
        ...current,
        [spaceId]: {
          ...existing,
          bodies: { ...existing.bodies, [keyOf(categoryKey)]: body },
        },
      };
    });
  }

  async function run(action: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update spaces.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      const created = await api.createSpace(projectId, name);
      setSpaces((current) =>
        [...current, created].sort((a, b) => a.sort_order - b.sort_order),
      );
      setForms((current) => ({
        ...current,
        [created.id]: { name: created.name, note: created.note, bodies: {} },
      }));
      setOpenId(created.id);
      setNewName("");
      setNotice(`Added ${created.name}.`);
      requestAnimationFrame(() => {
        document.getElementById(`space-${created.id}`)?.scrollIntoView({ block: "nearest" });
      });
    });
  }

  function onMove(id: string, direction: -1 | 1) {
    const index = ordered.findIndex((space) => space.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const reordered = next.map((space, position) => ({ ...space, sort_order: position + 1 }));
    void run(async () => {
      setSpaces(reordered);
      try {
        await api.reorderSpaces(
          projectId,
          reordered.map((space) => space.id),
        );
      } catch (err) {
        setSpaces(ordered);
        throw err;
      }
    });
  }

  function onRemove(space: ProjectSpace) {
    const label = forms[space.id]?.name.trim() || space.name;
    if (!window.confirm(`Remove “${label}”? Its system narrative leaves this project.`)) return;
    void run(async () => {
      await api.archiveSpace(space.id);
      const remaining = ordered.filter((item) => item.id !== space.id);
      setSpaces(remaining);
      setNarratives((current) => current.filter((row) => row.space_id !== space.id));
      setForms((current) => {
        const next = { ...current };
        delete next[space.id];
        return next;
      });
      setOpenId((current) => (current === space.id ? (remaining[0]?.id ?? null) : current));
    });
  }

  function onSave() {
    const missing = ordered.find((space) => !forms[space.id]?.name.trim());
    if (missing) {
      setError("Every space needs a name.");
      setNotice(null);
      setOpenId(missing.id);
      return;
    }
    void run(async () => {
      const saved = await Promise.all(
        ordered.map(async (space) => {
          const form = forms[space.id];
          if (!form?.name.trim()) throw new Error("Every space needs a name.");
          const meta = api.updateSpace(space.id, {
            name: form.name,
            note: form.note,
          });
          if (mode !== "edit") {
            return { updated: await meta, narratives: null as SpaceSystemNarrative[] | null };
          }
          const rows = rowsForSpace(space.id, scopeItems, narratives, form);
          const drafts = draftsFor(space.id, rows, form, narratives);
          const [updated, savedNarratives] = await Promise.all([
            meta,
            api.saveNarratives(space.id, drafts),
          ]);
          return { updated, narratives: savedNarratives };
        }),
      );
      setSpaces(saved.map((row) => row.updated));
      if (mode === "edit") {
        const touched = new Set(ordered.map((space) => space.id));
        setNarratives((current) => [
          ...current.filter((row) => !touched.has(row.space_id)),
          ...saved.flatMap((row) => row.narratives ?? []),
        ]);
      }
      setNotice(mode === "edit" ? "System narrative saved." : "Spaces saved.");
    });
  }

  return (
    <section
      id="system-narrative"
      aria-labelledby="system-narrative-heading"
      className="scroll-mt-8 rounded-sm border border-rule bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="system-narrative-heading" className="font-serif text-3xl">
            System narrative
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            {mode === "edit"
              ? "How systems land in each space. Overview first, then one note per system in scope on the checklist. Save brief stores the checklist and the project narrative. Save system narrative stores these spaces and notes."
              : "Spaces on this project. The brief holds the per-system notes and is what prints."}
          </p>
        </div>
        {mode === "summary" && narrativeHref ? (
          <Link
            to={narrativeHref}
            className="no-print text-sm underline underline-offset-2"
          >
            Edit system narrative
          </Link>
        ) : null}
      </div>

      {mode === "summary" && !narrativeHref ? (
        <p className="mt-3 text-sm text-ink-soft">
          Create the design brief to write category notes. Spaces added here show up on that brief.
        </p>
      ) : null}

      <form className="no-print mt-5 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onAdd}>
        <Field label="New space" className="flex-1">
          <input
            className={fieldControlClass}
            value={newName}
            maxLength={160}
            autoComplete="off"
            placeholder="Lobby, guest rooms, F&B, back of house"
            onChange={(event) => setNewName(event.target.value)}
          />
        </Field>
        <Button type="submit" disabled={busy || !newName.trim()}>
          Add space
        </Button>
      </form>

      {loading ? <p className="mt-6 font-serif text-2xl text-ink-soft">Loading spaces_</p> : null}

      {!loading && ordered.length === 0 ? (
        <div className="no-print mt-6">
          <EmptyState
            title="No spaces yet"
            body="Add the rooms or zones where systems land. Each one gets an overview and a note for every in-scope system."
          />
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {ordered.map((space, index) => {
          const form = forms[space.id] ?? { name: space.name, note: space.note, bodies: {} };
          const rows = rowsForSpace(space.id, scopeItems, narratives, form);
          const open = mode === "summary" || openId === space.id;
          const filled = Object.values(form.bodies).filter((body) => body.trim()).length;
          return (
            <article key={space.id} id={`space-${space.id}`} className="rounded-sm border border-rule p-4">
              <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                {mode === "edit" ? (
                  <button
                    type="button"
                    className="text-left"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : space.id)}
                  >
                    <span className="font-serif text-2xl">{form.name.trim() || "Untitled space"}</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {form.note.trim() || "No short note"}
                      {" · "}
                      {filled} {filled === 1 ? "note" : "notes"}
                    </span>
                  </button>
                ) : (
                  <div>
                    <h3 className="font-serif text-2xl">{form.name.trim() || "Untitled space"}</h3>
                    {form.bodies[OVERVIEW_KEY]?.trim() ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-soft">
                        {form.bodies[OVERVIEW_KEY]}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-ink-soft">No overview yet.</p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === 0}
                    onClick={() => void onMove(space.id, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === ordered.length - 1}
                    onClick={() => void onMove(space.id, 1)}
                  >
                    Down
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => void onRemove(space)}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              {mode === "edit" ? (
                <div className="print-only space-print mt-2">
                  <h3 className="font-serif text-2xl">{form.name.trim() || "Untitled space"}</h3>
                  {form.note.trim() ? <p className="mt-1 text-sm">{form.note}</p> : null}
                  {rows.map((row) => {
                    const body = form.bodies[keyOf(row.category_key)]?.trim() ?? "";
                    if (!body) return null;
                    return (
                      <div key={keyOf(row.category_key)} className="mt-3">
                        <h4 className="font-mono text-[11px] uppercase tracking-[0.14em]">
                          {row.label}
                        </h4>
                        <p className="mt-1 text-sm leading-6">{body}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {open ? (
                <div className={mode === "edit" ? "no-print mt-4 space-y-4" : "mt-4 space-y-4"}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Name">
                      <input
                        className={fieldControlClass}
                        value={form.name}
                        maxLength={160}
                        autoComplete="off"
                        required
                        onChange={(event) => patchForm(space.id, { name: event.target.value })}
                      />
                    </Field>
                    <Field label="Short note" hint="Optional. A few words on what this space is.">
                      <input
                        className={fieldControlClass}
                        value={form.note}
                        maxLength={400}
                        onChange={(event) => patchForm(space.id, { note: event.target.value })}
                      />
                    </Field>
                  </div>
                  {mode === "edit"
                    ? rows.map((row) => (
                        <Field
                          key={keyOf(row.category_key)}
                          label={row.label}
                          hint={
                            row.outOfScope
                              ? "Not in scope on the checklist. Kept so the note is not lost."
                              : row.category_key === null
                                ? "The whole space, before the per-system notes."
                                : undefined
                          }
                        >
                          <textarea
                            className={`${fieldControlClass} min-h-24`}
                            value={form.bodies[keyOf(row.category_key)] ?? ""}
                            placeholder={
                              row.category_key === null
                                ? "What a guest notices, what stays hidden, how the space is meant to work."
                                : "How this system lands in this space."
                            }
                            onChange={(event) =>
                              patchBody(space.id, row.category_key, event.target.value)
                            }
                          />
                        </Field>
                      ))
                    : null}
                  {mode === "edit" && rows.length === 1 ? (
                    <p className="text-sm text-ink-soft">
                      No systems are in scope yet. The overview still saves. Tick the checklist to
                      open a row per category.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {ordered.length > 0 ? (
        <div className="no-print mt-5 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={busy} onClick={() => void onSave()}>
            {mode === "edit" ? "Save system narrative" : "Save spaces"}
          </Button>
          {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
          <ErrorText>{error}</ErrorText>
        </div>
      ) : (
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </section>
  );
}
