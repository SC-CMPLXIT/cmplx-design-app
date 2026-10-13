import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import {
  answerKey,
  flattenSpaces,
  placeSpaceInGroup,
  spaceDraftFrom,
  visibleDiscoveryQuestions,
} from "@/lib/discovery";
import type {
  DiscoveryAttachment,
  DiscoveryAttachmentKind,
  DiscoveryDiscrepancy,
  DiscoveryDiscrepancyDraft,
  DiscoverySpace,
  DiscoverySpaceDraft,
  KickoffQuestion,
  Project,
  QuestionAnswerStatus,
  TechnologySystem,
} from "@/lib/types";
import {
  buildDiscoveryAgenda,
  buildSpaceGuide,
  discoveryAgendaFilename,
  downloadTextFile,
} from "@/lib/space-guide";
import { useKeyedAutosave } from "@/lib/use-autosave";
import { DiscoveryCall } from "./DiscoveryCall";
import { DiscoveryChecklist } from "./DiscoveryChecklist";
import { DiscoveryFiles } from "./DiscoveryFiles";
import { DiscoveryGaps } from "./DiscoveryGaps";
import { DiscoverySpaces } from "./DiscoverySpaces";
import { SpaceGuidePrint, waitForSpaceGuideImages } from "./SpaceGuidePrint";
import { Button, ErrorText } from "./ui";

type Panel = "spaces" | "files" | "checklist" | "gaps";
type LocalAnswer = { body: string; status: QuestionAnswerStatus };

function panelFrom(value: string | null): Panel {
  if (value === "files" || value === "checklist" || value === "gaps") return value;
  return "spaces";
}

export function DiscoveryPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const panel = panelFrom(params.get("panel"));
  const call = params.get("call") === "1";
  const [project, setProject] = useState<Project | null>(null);
  const [spaces, setSpaces] = useState<DiscoverySpace[]>([]);
  const [attachments, setAttachments] = useState<DiscoveryAttachment[]>([]);
  const [systems, setSystems] = useState<TechnologySystem[]>([]);
  const [questions, setQuestions] = useState<KickoffQuestion[]>([]);
  const [scopeOn, setScopeOn] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [gaps, setGaps] = useState<DiscoveryDiscrepancy[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DiscoverySpaceDraft>>({});
  const [gapDrafts, setGapDrafts] = useState<Record<string, DiscoveryDiscrepancyDraft>>({});
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [agendaNotice, setAgendaNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const agendaTimer = useRef<number | null>(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const spacesRef = useRef(spaces);
  spacesRef.current = spaces;

  const onSaveError = useCallback((_key: string, err: unknown) => {
    setError(err instanceof Error ? err.message : "Could not save.");
  }, []);

  const saveSpace = useCallback(
    async (id: string, draft: DiscoverySpaceDraft) => {
      const saved = await api.updateDiscoverySpace(projectId, id, draft);
      setSpaces((current) =>
        current.map((space) =>
          space.id === id ? { ...saved, sort_order: space.sort_order } : space,
        ),
      );
      setError(null);
    },
    [projectId],
  );
  const saveAnswer = useCallback(
    async (_key: string, draft: LocalAnswer & { space_id: string; question_key: string }) => {
      await api.saveDiscoveryAnswer(projectId, draft);
      setError(null);
    },
    [projectId],
  );
  const saveGap = useCallback(
    async (id: string, draft: DiscoveryDiscrepancyDraft) => {
      const saved = await api.updateDiscoveryDiscrepancy(projectId, id, draft);
      setGaps((current) => current.map((gap) => (gap.id === id ? saved : gap)));
      setError(null);
    },
    [projectId],
  );

  const spacesSave = useKeyedAutosave(saveSpace, onSaveError);
  const answersSave = useKeyedAutosave(saveAnswer, onSaveError);
  const gapsSave = useKeyedAutosave(saveGap, onSaveError);

  const flushPending = useCallback(async () => {
    await Promise.all([spacesSave.flush(), answersSave.flush(), gapsSave.flush()]);
  }, [answersSave, gapsSave, spacesSave]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [row, bundle, notes] = await Promise.all([
          api.getProject(projectId),
          api.getDiscovery(projectId),
          api.listStatusUpdates(projectId),
        ]);
        if (cancelled) return;
        if (!row) {
          setProject(null);
          setError("Project not found — it may have been archived.");
          return;
        }
        const nextDrafts: Record<string, DiscoverySpaceDraft> = {};
        for (const space of bundle.spaces) nextDrafts[space.id] = spaceDraftFrom(space);
        const nextAnswers: Record<string, LocalAnswer> = {};
        for (const answer of bundle.answers) {
          nextAnswers[answerKey(answer.space_id, answer.question_key)] = {
            body: answer.body,
            status: answer.status,
          };
        }
        const nextGaps: Record<string, DiscoveryDiscrepancyDraft> = {};
        for (const gap of bundle.discrepancies) {
          nextGaps[gap.id] = {
            space_id: gap.space_id,
            plan_shows: gap.plan_shows,
            notes_say: gap.notes_say,
            severity: gap.severity,
            status: gap.status,
            resolution_note: gap.resolution_note,
          };
        }
        const nextScope: Record<string, boolean> = {};
        for (const system of bundle.systems) {
          nextScope[system.key] =
            bundle.scope.find((item) => item.system_key === system.key)?.in_scope ?? false;
        }
        setProject(row);
        setStatusNote(notes[0]?.body.trim() || null);
        setSpaces(bundle.spaces);
        setAttachments(bundle.attachments);
        setSystems(bundle.systems);
        setQuestions(bundle.questions);
        setScopeOn(nextScope);
        setAnswers(nextAnswers);
        setGaps(bundle.discrepancies);
        setDrafts(nextDrafts);
        setGapDrafts(nextGaps);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load discovery.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (agendaTimer.current !== null) window.clearTimeout(agendaTimer.current);
    };
  }, []);

  const inScope = useMemo(
    () => new Set(systems.filter((system) => scopeOn[system.key]).map((system) => system.key)),
    [systems, scopeOn],
  );
  const visibleQuestions = useMemo(
    () => visibleDiscoveryQuestions(questions, systems, inScope),
    [questions, systems, inScope],
  );
  const orderedSpaces = useMemo(() => flattenSpaces(spaces), [spaces]);
  const selectedId = params.get("space");
  const selected =
    orderedSpaces.find((space) => space.id === selectedId)?.id ?? orderedSpaces[0]?.id ?? null;

  function writeParams(next: { panel?: Panel; call?: boolean; space?: string | null }) {
    const paramsNext = new URLSearchParams(params);
    if (next.panel) paramsNext.set("panel", next.panel);
    if (next.call) paramsNext.set("call", "1");
    else if (next.call === false) paramsNext.delete("call");
    if (next.space) paramsNext.set("space", next.space);
    else if (next.space === null) paramsNext.delete("space");
    setParams(paramsNext, { replace: true });
  }

  function rememberSpace(id: string, draft: DiscoverySpaceDraft) {
    setDrafts((current) => ({ ...current, [id]: draft }));
  }

  function onSpaceDraft(id: string, draft: DiscoverySpaceDraft, immediate = false) {
    rememberSpace(id, draft);
    draftsRef.current = { ...draftsRef.current, [id]: draft };
    if (!draft.name.trim()) return;
    const committed = spacesRef.current.find((space) => space.id === id);
    if (immediate && committed && committed.group_name.trim() !== draft.group_name.trim()) {
      const merged = spacesRef.current.map((space) =>
        space.id === id ? { ...space, group_name: draft.group_name.trim() } : space,
      );
      const ordered = placeSpaceInGroup(merged, id, draft.group_name).map((space, index) => ({
        ...space,
        sort_order: index + 1,
      }));
      spacesRef.current = ordered;
      setSpaces(ordered);
      void api.reorderDiscoverySpaces(projectId, ordered.map((space) => space.id)).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not reorder spaces.");
      });
    }
    spacesSave.queue(id, draft, immediate);
  }

  function onNotes(spaceId: string, notes: string, immediate = false) {
    const current = draftsRef.current[spaceId];
    if (!current) return;
    onSpaceDraft(spaceId, { ...current, notes }, immediate);
  }

  function onAnswer(
    spaceId: string,
    questionKey: string,
    next: LocalAnswer,
    immediate = false,
  ) {
    const key = answerKey(spaceId, questionKey);
    setAnswers((current) => ({ ...current, [key]: next }));
    answersSave.queue(
      key,
      { space_id: spaceId, question_key: questionKey, body: next.body, status: next.status },
      immediate,
    );
  }

  function onGapDraft(id: string, draft: DiscoveryDiscrepancyDraft, immediate = false) {
    setGapDrafts((current) => ({ ...current, [id]: draft }));
    if (!draft.plan_shows.trim() && !draft.notes_say.trim()) return;
    gapsSave.queue(id, draft, immediate);
  }

  async function onCreateSpace(name: string, groupName: string) {
    try {
      setError(null);
      const created = await api.createDiscoverySpace(projectId, name, groupName);
      setSpaces((current) => [...current, created]);
      setDrafts((current) => ({ ...current, [created.id]: spaceDraftFrom(created) }));
      writeParams({ space: created.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add a space.");
      throw err;
    }
  }

  async function onReorder(orderedIds: string[]) {
    const previous = spaces;
    try {
      setError(null);
      const byId = new Map(spaces.map((space) => [space.id, space]));
      const ordered = orderedIds.map((id, index) => {
        const space = byId.get(id);
        if (!space) throw new Error("Space not found.");
        return { ...space, sort_order: index + 1 };
      });
      spacesRef.current = ordered;
      setSpaces(ordered);
      await api.reorderDiscoverySpaces(projectId, orderedIds);
    } catch (err) {
      spacesRef.current = previous;
      setSpaces(previous);
      setError(err instanceof Error ? err.message : "Could not reorder spaces.");
    }
  }

  async function onArchiveSpace(id: string) {
    try {
      setError(null);
      await api.archiveDiscoverySpace(projectId, id);
      setSpaces((current) => current.filter((space) => space.id !== id));
      setDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove space.");
    }
  }

  async function onUpload(kind: DiscoveryAttachmentKind, file: File) {
    try {
      setError(null);
      const uploaded = await api.uploadDiscoveryFile(projectId, kind, file);
      setAttachments((current) =>
        [...current, uploaded].sort((a, b) => a.sort_order - b.sort_order),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the file.");
      throw err;
    }
  }

  async function onArchiveFile(id: string) {
    try {
      setError(null);
      await api.archiveDiscoveryAttachment(projectId, id);
      setAttachments((current) => current.filter((file) => file.id !== id));
      setSpaces((current) =>
        current.map((space) =>
          space.thumbnail_attachment_id === id
            ? { ...space, thumbnail_attachment_id: null }
            : space,
        ),
      );
      setDrafts((current) => {
        const next = { ...current };
        for (const [spaceId, draft] of Object.entries(next)) {
          if (draft.thumbnail_attachment_id === id) {
            next[spaceId] = { ...draft, thumbnail_attachment_id: null };
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the file.");
    }
  }

  async function onCreateGap(draft: DiscoveryDiscrepancyDraft) {
    try {
      setError(null);
      const created = await api.createDiscoveryDiscrepancy(projectId, draft);
      setGaps((current) => [...current, created]);
      setGapDrafts((current) => ({
        ...current,
        [created.id]: {
          space_id: created.space_id,
          plan_shows: created.plan_shows,
          notes_say: created.notes_say,
          severity: created.severity,
          status: created.status,
          resolution_note: created.resolution_note,
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add a discrepancy.");
      throw err;
    }
  }

  async function onArchiveGap(id: string) {
    try {
      setError(null);
      await api.archiveDiscoveryDiscrepancy(projectId, id);
      setGaps((current) => current.filter((gap) => gap.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove discrepancy.");
    }
  }

  if (loading) return <p className="font-serif text-2xl text-ink-soft">Loading_</p>;

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

  const openGaps = gaps.filter((gap) => (gapDrafts[gap.id]?.status ?? gap.status) === "open").length;
  const systemsInScope = systems
    .filter((system) => scopeOn[system.key])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((system) => system.name);
  const guide = buildSpaceGuide({
    project,
    statusNote,
    spaces,
    drafts,
    attachments,
    questions: visibleQuestions,
    answers,
    gaps,
    gapDrafts,
    systemsInScope,
  });

  const noteAgenda = (ok: boolean, text: string) => {
    setAgendaNotice({ ok, text });
    if (agendaTimer.current !== null) window.clearTimeout(agendaTimer.current);
    agendaTimer.current = window.setTimeout(() => setAgendaNotice(null), 4000);
  };

  const filesForExport = async () => {
    try {
      const bundle = await api.getDiscovery(project.id);
      return bundle.attachments;
    } catch {
      return attachments;
    }
  }

  const onPrintGuide = async () => {
    await flushPending();
    const files = await filesForExport();
    flushSync(() => setAttachments(files));
    await waitForSpaceGuideImages();
    window.print();
  }

  const onDocx = async () => {
    setExporting(true);
    setError(null);
    try {
      await flushPending();
      const files = await filesForExport();
      flushSync(() => setAttachments(files));
      const { downloadSpaceGuideDocx } = await import("@/lib/space-guide-docx");
      await downloadSpaceGuideDocx(
        buildSpaceGuide({
          project,
          statusNote,
          spaces,
          drafts,
          attachments: files,
          questions: visibleQuestions,
          answers,
          gaps,
          gapDrafts,
          systemsInScope,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the space guide.");
    } finally {
      setExporting(false);
    }
  }

  const onCopyAgenda = async () => {
    await flushPending();
    const ok = await copyText(buildDiscoveryAgenda(guide));
    noteAgenda(ok, ok ? "Agenda copied." : "Could not copy from this browser.");
  }

  const onDownloadAgenda = () => {
    void flushPending();
    downloadTextFile(discoveryAgendaFilename(project.name), buildDiscoveryAgenda(guide));
    noteAgenda(true, "Agenda downloaded.");
  }

  const tabs: { id: Panel; label: string }[] = [
    { id: "spaces", label: "Spaces" },
    { id: "files", label: "Drawings" },
    { id: "checklist", label: "Checklist" },
    { id: "gaps", label: openGaps ? `Discrepancies ${openGaps}` : "Discrepancies" },
  ];

  return (
    <div className="min-w-0">
      <div className="no-print mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            <Link to={`/projects/${project.id}`} className="hover:underline">
              {project.name}
            </Link>{" "}
            · Discovery
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Rooms_</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Walk each room against the plan. Questions follow the systems in scope that apply to a
            space. Answers autosave. Print and DOCX are the space guide. The agenda is the open
            questions and open discrepancies, as plain text.
          </p>
        </div>
        <div className="flex max-w-full flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => void onPrintGuide()}>
              Print / PDF
            </Button>
            <Button type="button" variant="ghost" onClick={() => void onDocx()} disabled={exporting}>
              {exporting ? "Preparing DOCX…" : "Download DOCX"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void onCopyAgenda()}>
              Copy agenda
            </Button>
            <Button type="button" variant="ghost" onClick={onDownloadAgenda}>
              Agenda .txt
            </Button>
            {call ? null : (
              <Button type="button" onClick={() => writeParams({ call: true, space: selected })}>
                Live call
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => navigate(`/projects/${project.id}`)}>
              Back
            </Button>
          </div>
          {agendaNotice ? (
            <p
              role="status"
              className={agendaNotice.ok ? "text-sm text-emerald-800" : "text-sm text-rose-800"}
            >
              {agendaNotice.text}
            </p>
          ) : null}
        </div>
      </div>
      <div className="no-print mb-4">
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="no-print">
      {call ? (
        <DiscoveryCall
          spaces={spaces}
          attachments={attachments}
          questions={visibleQuestions}
          selectedId={selected}
          drafts={drafts}
          answers={answers}
          spaceHints={spacesSave.hints}
          answerHints={answersSave.hints}
          onSelect={(spaceId) => writeParams({ space: spaceId, call: true })}
          onNotes={onNotes}
          onAnswer={onAnswer}
          onExit={() => writeParams({ call: false, panel: "checklist" })}
          onEditSpace={() => writeParams({ call: false, panel: "spaces", space: selected })}
        />
      ) : (
        <>
          <div className="no-print mb-6 flex flex-wrap gap-1" role="tablist" aria-label="Discovery">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={panel === tab.id}
                className={
                  panel === tab.id
                    ? "rounded-sm bg-ink px-3 py-1.5 text-sm text-paper"
                    : "rounded-sm border border-rule px-3 py-1.5 text-sm text-ink hover:bg-paper-2"
                }
                onClick={() => writeParams({ panel: tab.id, call: false })}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {panel === "spaces" ? (
            <DiscoverySpaces
              spaces={spaces}
              drafts={drafts}
              attachments={attachments}
              hints={spacesSave.hints}
              onDraft={onSpaceDraft}
              onRemember={rememberSpace}
              onCreate={onCreateSpace}
              onReorder={onReorder}
              onArchive={onArchiveSpace}
            />
          ) : null}
          {panel === "files" ? (
            <DiscoveryFiles
              attachments={attachments}
              onUpload={onUpload}
              onArchive={onArchiveFile}
            />
          ) : null}
          {panel === "checklist" ? (
            <DiscoveryChecklist
              projectId={project.id}
              spaces={spaces}
              systems={systems}
              questions={visibleQuestions}
              inScope={inScope}
              selectedId={selected}
              answers={answers}
              hints={answersSave.hints}
              onSelect={(spaceId) => writeParams({ space: spaceId })}
              onAnswer={onAnswer}
            />
          ) : null}
          {panel === "gaps" ? (
            <DiscoveryGaps
              spaces={spaces}
              gaps={gaps}
              drafts={gapDrafts}
              hints={gapsSave.hints}
              onDraft={onGapDraft}
              onCreate={onCreateGap}
              onArchive={onArchiveGap}
            />
          ) : null}
        </>
      )}
      </div>
      <SpaceGuidePrint model={guide} />
    </div>
  );
}
