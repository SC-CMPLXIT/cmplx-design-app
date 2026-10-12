import { FormEvent, useState } from "react";
import { SEVERITY_LABEL } from "@/lib/discovery";
import {
  DISCOVERY_DISCREPANCY_STATUSES,
  DISCOVERY_SEVERITIES,
  type DiscoveryDiscrepancy,
  type DiscoveryDiscrepancyDraft,
  type DiscoveryDiscrepancyStatus,
  type DiscoverySeverity,
  type DiscoverySpace,
} from "@/lib/types";
import type { SaveHint } from "@/lib/use-autosave";
import { Button, Field, fieldControlClass } from "./ui";
import { SaveLine } from "./DiscoveryBits";

const STATUS_LABEL: Record<DiscoveryDiscrepancyStatus, string> = {
  open: "Open",
  resolved: "Resolved",
};

export function DiscoveryGaps({
  spaces,
  gaps,
  drafts,
  hints,
  onDraft,
  onCreate,
  onArchive,
}: {
  spaces: DiscoverySpace[];
  gaps: DiscoveryDiscrepancy[];
  drafts: Record<string, DiscoveryDiscrepancyDraft>;
  hints: Record<string, SaveHint>;
  onDraft: (id: string, draft: DiscoveryDiscrepancyDraft, immediate?: boolean) => void;
  onCreate: (draft: DiscoveryDiscrepancyDraft) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}) {
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [severity, setSeverity] = useState<DiscoverySeverity>("medium");
  const [adding, setAdding] = useState(false);
  const open = gaps.filter((gap) => gap.status === "open").length;

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!plan.trim() && !notes.trim()) return;
    setAdding(true);
    try {
      await onCreate({
        space_id: spaceId || null,
        plan_shows: plan,
        notes_say: notes,
        severity,
        status: "open",
        resolution_note: "",
      });
      setPlan("");
      setNotes("");
      setSpaceId("");
      setSeverity("medium");
    } catch {
      // The page shows the error.
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        {gaps.length === 0
          ? "No discrepancies yet."
          : `${open} open · ${gaps.length - open} resolved`}
      </p>
      <form className="grid gap-3 rounded-sm border border-rule bg-white p-4" onSubmit={(event) => void onAdd(event)}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Space">
            <select
              className={fieldControlClass}
              value={spaceId}
              onChange={(event) => setSpaceId(event.target.value)}
            >
              <option value="">Whole project</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severity">
            <select
              className={fieldControlClass}
              value={severity}
              onChange={(event) => setSeverity(event.target.value as DiscoverySeverity)}
            >
              {DISCOVERY_SEVERITIES.map((value) => (
                <option key={value} value={value}>
                  {SEVERITY_LABEL[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="What the plan shows">
          <textarea
            className={fieldControlClass}
            rows={2}
            maxLength={2000}
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
          />
        </Field>
        <Field label="What the notes say">
          <textarea
            className={fieldControlClass}
            rows={2}
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        <Button type="submit" disabled={adding || (!plan.trim() && !notes.trim())}>
          Add discrepancy
        </Button>
      </form>

      <div className="space-y-4">
        {gaps.map((gap) => {
          const draft = drafts[gap.id] ?? {
            space_id: gap.space_id,
            plan_shows: gap.plan_shows,
            notes_say: gap.notes_say,
            severity: gap.severity,
            status: gap.status,
            resolution_note: gap.resolution_note,
          };
          const archivedOption =
            gap.space_archived && gap.space_id
              ? { id: gap.space_id, name: `${gap.space_name ?? "Room"} (archived)` }
              : null;
          return (
            <article key={gap.id} className="min-w-0 rounded-sm border border-rule bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={
                    draft.severity === "high"
                      ? "font-mono text-[11px] uppercase tracking-[0.14em] text-rose-900"
                      : draft.severity === "medium"
                        ? "font-mono text-[11px] uppercase tracking-[0.14em] text-amber-900"
                        : "font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft"
                  }
                >
                  {SEVERITY_LABEL[draft.severity]} · {STATUS_LABEL[draft.status]}
                  {draft.space_id ? "" : " · Whole project"}
                </p>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    if (!window.confirm("Remove this discrepancy?")) return;
                    void onArchive(gap.id);
                  }}
                >
                  Remove
                </Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Space">
                  <select
                    className={fieldControlClass}
                    value={draft.space_id ?? ""}
                    onChange={(event) =>
                      onDraft(
                        gap.id,
                        { ...draft, space_id: event.target.value || null },
                        true,
                      )
                    }
                  >
                    <option value="">Whole project</option>
                    {archivedOption ? (
                      <option value={archivedOption.id}>{archivedOption.name}</option>
                    ) : null}
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Severity">
                    <select
                      className={fieldControlClass}
                      value={draft.severity}
                      onChange={(event) =>
                        onDraft(
                          gap.id,
                          { ...draft, severity: event.target.value as DiscoverySeverity },
                          true,
                        )
                      }
                    >
                      {DISCOVERY_SEVERITIES.map((value) => (
                        <option key={value} value={value}>
                          {SEVERITY_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select
                      className={fieldControlClass}
                      value={draft.status}
                      onChange={(event) =>
                        onDraft(
                          gap.id,
                          {
                            ...draft,
                            status: event.target.value as DiscoveryDiscrepancyStatus,
                          },
                          true,
                        )
                      }
                    >
                      {DISCOVERY_DISCREPANCY_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {STATUS_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="What the plan shows" className="md:col-span-2">
                  <textarea
                    className={fieldControlClass}
                    rows={2}
                    maxLength={2000}
                    value={draft.plan_shows}
                    onChange={(event) =>
                      onDraft(gap.id, { ...draft, plan_shows: event.target.value })
                    }
                    onBlur={() => onDraft(gap.id, draft, true)}
                  />
                </Field>
                <Field label="What the notes say" className="md:col-span-2">
                  <textarea
                    className={fieldControlClass}
                    rows={2}
                    maxLength={2000}
                    value={draft.notes_say}
                    onChange={(event) =>
                      onDraft(gap.id, { ...draft, notes_say: event.target.value })
                    }
                    onBlur={() => onDraft(gap.id, draft, true)}
                  />
                </Field>
                <Field
                  label="Resolution note"
                  hint={draft.status === "resolved" ? "What closed the gap." : "Optional until it is resolved."}
                  className="md:col-span-2"
                >
                  <textarea
                    className={fieldControlClass}
                    rows={2}
                    maxLength={2000}
                    value={draft.resolution_note}
                    onChange={(event) =>
                      onDraft(gap.id, { ...draft, resolution_note: event.target.value })
                    }
                    onBlur={() => onDraft(gap.id, draft, true)}
                  />
                  <SaveLine hint={hints[gap.id]} />
                  {!draft.plan_shows.trim() && !draft.notes_say.trim() ? (
                    <p className="text-xs text-rose-800">
                      Say what the plan shows or what the notes say.
                    </p>
                  ) : null}
                </Field>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
