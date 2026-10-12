import { FormEvent, useState } from "react";
import {
  flattenSpaces,
  formatBytes,
  groupSpaces,
  moveSpace,
} from "@/lib/discovery";
import type { DiscoveryAttachment, DiscoverySpace, DiscoverySpaceDraft } from "@/lib/types";
import type { SaveHint } from "@/lib/use-autosave";
import { Button, Field, fieldControlClass } from "./ui";
import { SaveLine } from "./DiscoveryBits";

export function DiscoverySpaces({
  spaces,
  drafts,
  attachments,
  hints,
  onDraft,
  onRemember,
  onCreate,
  onReorder,
  onArchive,
}: {
  spaces: DiscoverySpace[];
  drafts: Record<string, DiscoverySpaceDraft>;
  attachments: DiscoveryAttachment[];
  hints: Record<string, SaveHint>;
  onDraft: (id: string, draft: DiscoverySpaceDraft, immediate?: boolean) => void;
  onRemember: (id: string, draft: DiscoverySpaceDraft) => void;
  onCreate: (name: string, groupName: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState(false);
  const renderings = attachments.filter((file) => file.kind === "rendering");
  const groups = groupSpaces(spaces);
  const groupNames = [...new Set(spaces.map((space) => space.group_name.trim()).filter(Boolean))];

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await onCreate(name, groupName);
      setName("");
      setGroupName("");
    } catch {
      // The page shows the error.
    } finally {
      setAdding(false);
    }
  }

  async function onMove(id: string, direction: -1 | 1) {
    const next = moveSpace(spaces, id, direction);
    if (!next) return;
    setMoving(true);
    try {
      await onReorder(next.map((space) => space.id));
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-sm border border-rule bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto] sm:items-end"
        onSubmit={(event) => void onAdd(event)}
      >
        <Field label="Room">
          <input
            className={fieldControlClass}
            value={name}
            maxLength={160}
            required
            placeholder="Conference, lobby, IDF…"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Group" hint="Floor or zone">
          <input
            className={fieldControlClass}
            value={groupName}
            maxLength={80}
            list="discovery-groups"
            placeholder="Level 2"
            onChange={(event) => setGroupName(event.target.value)}
          />
          <datalist id="discovery-groups">
            {groupNames.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </Field>
        <Button type="submit" disabled={adding || !name.trim()}>
          Add room
        </Button>
      </form>

      {spaces.length === 0 ? (
        <p className="rounded-sm border border-dashed border-rule bg-white/60 px-4 py-8 text-sm leading-6 text-ink-soft">
          No discovery rooms yet. Add the rooms you will walk on the call. These are separate from
          the system-narrative spaces on the project page.
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.name || "ungrouped"} className="min-w-0">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            {group.label}
          </h2>
          <div className="mt-3 space-y-4">
            {group.spaces.map((space, index) => {
              const draft = drafts[space.id] ?? {
                name: space.name,
                group_name: space.group_name,
                plan_shows: space.plan_shows,
                intended_use: space.intended_use,
                occupancy: space.occupancy,
                notes: space.notes,
                thumbnail_attachment_id: space.thumbnail_attachment_id,
              };
              const thumb = renderings.find((file) => file.id === draft.thumbnail_attachment_id);
              return (
                <article
                  key={space.id}
                  id={`discovery-space-${space.id}`}
                  className="min-w-0 rounded-sm border border-rule bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words font-serif text-2xl">
                      {draft.name.trim() || "Untitled room"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={moving || index === 0}
                        onClick={() => void onMove(space.id, -1)}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={moving || index === group.spaces.length - 1}
                        onClick={() => void onMove(space.id, 1)}
                      >
                        Down
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => {
                          if (!window.confirm(`Remove “${space.name}” from discovery?`)) return;
                          void onArchive(space.id);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Field label="Name">
                      <input
                        className={fieldControlClass}
                        value={draft.name}
                        maxLength={160}
                        onChange={(event) =>
                          onDraft(space.id, { ...draft, name: event.target.value })
                        }
                        onBlur={() => onDraft(space.id, draft, true)}
                      />
                    </Field>
                    <Field label="Group" hint="Floor or zone. Applied when you leave the field.">
                      <input
                        className={fieldControlClass}
                        value={draft.group_name}
                        maxLength={80}
                        list="discovery-groups"
                        onChange={(event) =>
                          onRemember(space.id, { ...draft, group_name: event.target.value })
                        }
                        onBlur={() =>
                          onDraft(
                            space.id,
                            drafts[space.id] ?? draft,
                            true,
                          )
                        }
                      />
                    </Field>
                    <Field label="Plan shows" className="md:col-span-2">
                      <textarea
                        className={fieldControlClass}
                        rows={3}
                        maxLength={2000}
                        value={draft.plan_shows}
                        onChange={(event) =>
                          onDraft(space.id, { ...draft, plan_shows: event.target.value })
                        }
                        onBlur={() => onDraft(space.id, drafts[space.id] ?? draft, true)}
                      />
                    </Field>
                    <Field label="Intended use">
                      <textarea
                        className={fieldControlClass}
                        rows={2}
                        maxLength={2000}
                        value={draft.intended_use}
                        onChange={(event) =>
                          onDraft(space.id, { ...draft, intended_use: event.target.value })
                        }
                        onBlur={() => onDraft(space.id, drafts[space.id] ?? draft, true)}
                      />
                    </Field>
                    <Field label="Occupancy">
                      <input
                        className={fieldControlClass}
                        value={draft.occupancy}
                        maxLength={160}
                        onChange={(event) =>
                          onDraft(space.id, { ...draft, occupancy: event.target.value })
                        }
                        onBlur={() => onDraft(space.id, drafts[space.id] ?? draft, true)}
                      />
                    </Field>
                    <Field label="Notes" className="md:col-span-2">
                      <textarea
                        className={fieldControlClass}
                        rows={3}
                        maxLength={8000}
                        value={draft.notes}
                        onChange={(event) =>
                          onDraft(space.id, { ...draft, notes: event.target.value })
                        }
                        onBlur={() => onDraft(space.id, drafts[space.id] ?? draft, true)}
                      />
                      <SaveLine hint={hints[space.id]} />
                      {!draft.name.trim() ? (
                        <p className="text-xs text-rose-800">A space needs a name.</p>
                      ) : null}
                    </Field>
                    <Field label="Thumbnail" hint="Choose an uploaded rendering." className="md:col-span-2">
                      <select
                        className={fieldControlClass}
                        value={draft.thumbnail_attachment_id ?? ""}
                        onChange={(event) =>
                          onDraft(
                            space.id,
                            {
                              ...draft,
                              thumbnail_attachment_id: event.target.value || null,
                            },
                            true,
                          )
                        }
                      >
                        <option value="">No thumbnail</option>
                        {renderings.map((file) => (
                          <option key={file.id} value={file.id}>
                            {file.file_name} ({formatBytes(file.byte_size)})
                          </option>
                        ))}
                      </select>
                      {thumb?.signed_url ? (
                        <img
                          src={thumb.signed_url}
                          alt=""
                          className="mt-3 max-h-40 w-full rounded-sm border border-rule object-contain"
                        />
                      ) : null}
                    </Field>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs text-ink-soft">
        {flattenSpaces(spaces).length} {spaces.length === 1 ? "room" : "rooms"}. Up and Down move a
        room inside its group.
      </p>
    </div>
  );
}
