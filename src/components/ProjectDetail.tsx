import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emptyToNull } from "@/lib/dates";
import { PROJECT_STATUS_META } from "@/lib/status";
import {
  PROJECT_STATUSES,
  type DesignBrief,
  type Project,
  type ProjectStatus,
  type StatusUpdate,
} from "@/lib/types";
import { BillOfMaterials } from "./BillOfMaterials";
import { StatusNotes } from "./StatusNotes";
import { StatusPill } from "./StatusPill";
import { SystemNarrative } from "./SystemNarrative";
import { Button, ErrorText, Field, PageHeader, fieldControlClass } from "./ui";

export function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [creatingBrief, setCreatingBrief] = useState(false);

  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("pending");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [row, notes, existingBrief] = await Promise.all([
          api.getProject(projectId),
          api.listStatusUpdates(projectId),
          api.getBriefByProject(projectId),
        ]);
        if (cancelled) return;
        if (!row) {
          setError("Project not found — it may have been archived.");
          return;
        }
        setProject(row);
        setName(row.name);
        setOwner(row.owner);
        setStatus(row.status);
        setStartDate(row.start_date ?? "");
        setTargetDate(row.target_date ?? "");
        setUpdates(notes);
        setBrief(existingBrief);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load project.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateProject(project.id, {
        name,
        owner,
        status,
        start_date: emptyToNull(startDate),
        target_date: emptyToNull(targetDate),
      });
      setProject(updated);
      setNotice("Project saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project.");
    } finally {
      setSaving(false);
    }
  }

  async function onAddNote(body: string) {
    if (!project) return;
    const author = user?.displayName || user?.email || "Editor";
    const created = await api.addStatusUpdate(project.id, author, body);
    setUpdates((current) => [created, ...current]);
  }

  async function onCreateBrief() {
    if (!project) return;
    setCreatingBrief(true);
    setError(null);
    try {
      const created = await api.createBrief(project, owner || project.owner);
      navigate(`/projects/${project.id}/brief`);
      setBrief(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create brief.");
    } finally {
      setCreatingBrief(false);
    }
  }

  async function onArchive() {
    if (!project) return;
    if (!window.confirm(`Archive “${project.name}”? It will leave the live list.`)) return;
    setArchiving(true);
    try {
      await api.archiveProject(project.id);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive project.");
      setArchiving(false);
    }
  }

  if (loading) {
    return <p className="font-serif text-2xl text-ink-soft">Loading_</p>;
  }

  if (!project) {
    return (
      <div>
        <ErrorText>{error || "Project not found."}</ErrorText>
        <Button className="mt-4" variant="ghost" onClick={() => navigate("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description="Current status on the project. Notes below are the dated trail — they do not replace the pill."
        actions={
          <>
            {brief ? (
              <Link
                to={`/projects/${project.id}/brief`}
                className="inline-flex items-center rounded-sm bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-copper-deep"
              >
                Open brief
              </Link>
            ) : (
              <Button onClick={() => void onCreateBrief()} disabled={creatingBrief}>
                Create brief
              </Button>
            )}
            <Button variant="danger" onClick={() => void onArchive()} disabled={archiving}>
              Archive
            </Button>
          </>
        }
      />

      <form
        className="grid gap-4 rounded-sm border border-rule bg-white p-5 md:grid-cols-2"
        onSubmit={onSave}
      >
        <Field label="Name">
          <input
            className={fieldControlClass}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Owner">
          <input
            className={fieldControlClass}
            required
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
          />
        </Field>
        <Field label="Status">
          <div className="flex items-center gap-3">
            <select
              className={fieldControlClass}
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {PROJECT_STATUS_META[value].label}
                </option>
              ))}
            </select>
            <StatusPill status={status} />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 md:col-span-1">
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
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            Save project
          </Button>
          {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
          <ErrorText>{error}</ErrorText>
        </div>
      </form>

      <section className="rounded-sm border border-rule bg-white p-5">
        <h2 className="font-serif text-3xl">Design brief_</h2>
        {brief ? (
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Brief owner {brief.owner}. Status{" "}
            <StatusPill status={brief.status} kind="brief" />.{" "}
            <Link className="underline underline-offset-2" to={`/projects/${project.id}/brief`}>
              Edit header, checklist, project narrative, and system narrative
            </Link>
            . The bill of materials below prints with that brief.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            No brief yet. One brief per project — header, standard-15 systems
            checklist, three project narratives, and a system narrative per space.
            Equipment lines can start before the brief.
          </p>
        )}
      </section>

      <SystemNarrative
        projectId={project.id}
        scopeItems={brief?.scope_items ?? []}
        mode="summary"
        narrativeHref={brief ? `/projects/${project.id}/brief#system-narrative` : null}
      />

      <BillOfMaterials
        projectId={project.id}
        scopeItems={brief?.scope_items ?? []}
        mode="edit"
      />

      <StatusNotes updates={updates} onAdd={onAddNote} />
    </div>
  );
}
