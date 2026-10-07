import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { emptyToNull, formatDate } from "@/lib/dates";
import { BRIEF_STATUS_META } from "@/lib/status";
import {
  BRIEF_STATUSES,
  type BriefStatus,
  type DesignBrief,
  type Project,
  type ScopeItem,
} from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { SystemNarrative } from "./SystemNarrative";
import { Button, ErrorText, Field, fieldControlClass } from "./ui";

type DraftItem = ScopeItem;

export function BriefEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<BriefStatus>("draft");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [designIntent, setDesignIntent] = useState("");
  const [constraints, setConstraints] = useState("");
  const [openDecisions, setOpenDecisions] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await api.getProject(projectId);
        if (!row) {
          setError("Project not found.");
          return;
        }
        let existing = await api.getBriefByProject(projectId);
        if (!existing) {
          existing = await api.createBrief(row, row.owner);
        }
        if (cancelled) return;
        setProject(row);
        applyBrief(existing);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load brief.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const hashScrolled = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !brief) return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const token = `${projectId ?? ""}:${id}`;
    if (hashScrolled.current === token) return;
    hashScrolled.current = token;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [loading, projectId, brief]);

  function applyBrief(next: DesignBrief) {
    setBrief(next);
    setOwner(next.owner);
    setStatus(next.status);
    setStartDate(next.start_date ?? "");
    setTargetDate(next.target_date ?? "");
    setDesignIntent(next.design_intent);
    setConstraints(next.constraints);
    setOpenDecisions(next.open_decisions);
    setItems(next.scope_items);
  }

  const inScopeCount = useMemo(
    () => items.filter((item) => item.in_scope).length,
    [items],
  );

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!brief) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await api.saveBrief(brief.id, {
        owner,
        status,
        start_date: emptyToNull(startDate),
        target_date: emptyToNull(targetDate),
        design_intent: designIntent,
        constraints,
        open_decisions: openDecisions,
        scope_items: items.map((item) => ({
          id: item.id,
          in_scope: item.in_scope,
          note: item.note,
        })),
      });
      applyBrief(saved);
      setNotice("Brief saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save brief.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="font-serif text-2xl text-ink-soft">Loading_</p>;
  }

  if (!project || !brief) {
    return (
      <div>
        <ErrorText>{error || "Brief not found."}</ErrorText>
        <Button className="mt-4" variant="ghost" onClick={() => navigate("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div className="print-sheet space-y-8">
    <form className="space-y-8" onSubmit={onSave}>
      <div className="print-only mb-6 border-b border-black pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
          CMPLX iT Design · Design brief
        </p>
        <h1 className="mt-2 font-serif text-4xl">{project.name}</h1>
        <p className="mt-2 text-sm">
          Brief owner {owner} · {BRIEF_STATUS_META[status].label} · Printed{" "}
          {formatDate(new Date().toISOString().slice(0, 10))}
        </p>
      </div>

      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            <Link to={`/projects/${project.id}`} className="hover:underline">
              {project.name}
            </Link>{" "}
            · Design brief
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
            Brief editor_
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Header, standard-15 systems, project narrative, then a system
            narrative for each space. Print this view when you need to share —
            no PDF pipeline in v1.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            Save brief
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.print()}>
            Print
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(`/projects/${project.id}`)}>
            Back
          </Button>
        </div>
      </div>

      {notice ? <p className="no-print text-sm text-emerald-800">{notice}</p> : null}
      <ErrorText>{error}</ErrorText>

      <section className="rounded-sm border border-rule bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-3xl">Header</h2>
          <StatusPill status={status} kind="brief" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brief owner">
            <input
              className={fieldControlClass}
              required
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            />
          </Field>
          <Field label="Brief status">
            <select
              className={fieldControlClass}
              value={status}
              onChange={(event) => setStatus(event.target.value as BriefStatus)}
            >
              {BRIEF_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {BRIEF_STATUS_META[value].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              className={fieldControlClass}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>
          <Field label="Target date">
            <input
              className={fieldControlClass}
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-sm border border-rule bg-white p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl">Scope / systems</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Standard-15 hospitality-tech checklist. {inScopeCount} in scope.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rule font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              <tr>
                <th className="py-2 pr-3 font-medium">In scope</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-rule last:border-0">
                  <td className="py-2 pr-3 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-copper"
                      checked={item.in_scope}
                      onChange={(event) => {
                        const next = [...items];
                        next[index] = { ...item, in_scope: event.target.checked };
                        setItems(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3 align-middle font-medium">{item.category_name}</td>
                  <td className="py-2">
                    <input
                      className={fieldControlClass}
                      value={item.note}
                      onChange={(event) => {
                        const next = [...items];
                        next[index] = { ...item, note: event.target.value };
                        setItems(next);
                      }}
                      placeholder="Short note"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-sm border border-rule bg-white p-5">
        <h2 className="font-serif text-3xl">Project narrative</h2>
        <p className="text-sm leading-6 text-ink-soft">
          These three stay on the project. Space-by-space system notes are the
          next section.
        </p>
        <Field label="Design intent">
          <textarea
            className={`${fieldControlClass} min-h-32`}
            value={designIntent}
            onChange={(event) => setDesignIntent(event.target.value)}
            placeholder="What the space should feel like, and what the technology is there to do."
          />
        </Field>
        <Field label="Constraints">
          <textarea
            className={`${fieldControlClass} min-h-32`}
            value={constraints}
            onChange={(event) => setConstraints(event.target.value)}
            placeholder="Fabric, programme, budget, phasing, stay-put systems."
          />
        </Field>
        <Field label="Open decisions">
          <textarea
            className={`${fieldControlClass} min-h-32`}
            value={openDecisions}
            onChange={(event) => setOpenDecisions(event.target.value)}
            placeholder="What still has to be decided before the brief can lock."
          />
        </Field>
      </section>

      <div className="no-print flex gap-2">
        <Button type="submit" disabled={saving}>
          Save brief
        </Button>
        <Button type="button" variant="ghost" onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </form>
    <SystemNarrative projectId={project.id} scopeItems={items} mode="edit" />
    </div>
  );
}
