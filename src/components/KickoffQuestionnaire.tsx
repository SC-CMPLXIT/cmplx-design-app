import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import {
  ANSWER_STATUS_LABEL,
  APPLIES_TO_LABEL,
  exportAnswerText,
  questionIsVisible,
  systemKeysFromBrief,
} from "@/lib/systems";
import {
  QUESTION_ANSWER_STATUSES,
  type KickoffQuestion,
  type Project,
  type QuestionAnswerStatus,
  type ScopeItem,
  type TechnologySystem,
} from "@/lib/types";
import { Button, ErrorText, fieldControlClass } from "./ui";

type LocalAnswer = {
  body: string;
  status: QuestionAnswerStatus;
};

type SaveHint = "saving" | "saved" | "error";
type StatusFilter = "all" | QuestionAnswerStatus;

const SAVE_DELAY_MS = 450;

export function KickoffQuestionnaire() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [systems, setSystems] = useState<TechnologySystem[]>([]);
  const [questions, setQuestions] = useState<KickoffQuestion[]>([]);
  const [scopeOn, setScopeOn] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [briefItems, setBriefItems] = useState<ScopeItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [hints, setHints] = useState<Record<string, SaveHint>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [scopeSaving, setScopeSaving] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const scopeRef = useRef(scopeOn);
  scopeRef.current = scopeOn;
  const genRef = useRef<Record<string, number>>({});
  const timersRef = useRef<Record<string, number>>({});
  const dirtyRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  const projectIdRef = useRef(projectId ?? "");
  projectIdRef.current = projectId ?? "";
  const visibleKeysRef = useRef<string[]>([]);

  const persist = useCallback(
    async (id: string, key: string, snapshot: LocalAnswer, gen: number) => {
      try {
        await api.saveKickoffAnswer(id, {
          question_key: key,
          body: snapshot.body,
          status: snapshot.status,
        });
        if (!mountedRef.current || projectIdRef.current !== id || genRef.current[key] !== gen) return;
        dirtyRef.current.delete(key);
        setHints((current) => ({ ...current, [key]: "saved" }));
      } catch (err) {
        if (!mountedRef.current || projectIdRef.current !== id || genRef.current[key] !== gen) return;
        dirtyRef.current.add(key);
        setHints((current) => ({ ...current, [key]: "error" }));
        setError(err instanceof Error ? err.message : "Could not save answer.");
      }
    },
    [],
  );

  const flushKey = useCallback(
    (key: string) => {
      window.clearTimeout(timersRef.current[key]);
      delete timersRef.current[key];
      if (!dirtyRef.current.has(key)) return Promise.resolve();
      const snapshot = answersRef.current[key];
      const id = projectIdRef.current;
      if (!snapshot || !id) return Promise.resolve();
      const gen = genRef.current[key] ?? 0;
      return persist(id, key, snapshot, gen);
    },
    [persist],
  );

  const flushAll = useCallback(async () => {
    await Promise.all([...dirtyRef.current].map((key) => flushKey(key)));
  }, [flushKey]);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const dirty = dirtyRef.current;
    return () => {
      mountedRef.current = false;
      const id = projectIdRef.current;
      for (const key of [...dirty]) {
        window.clearTimeout(timers[key]);
        const snapshot = answersRef.current[key];
        const gen = genRef.current[key] ?? 0;
        if (snapshot && id) void persist(id, key, snapshot, gen);
      }
    };
  }, [persist, projectId]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (dirtyRef.current.size === 0) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    genRef.current = {};
    dirtyRef.current = new Set();
    for (const timer of Object.values(timersRef.current)) window.clearTimeout(timer);
    timersRef.current = {};
    void (async () => {
      try {
        const [row, bundle, brief] = await Promise.all([
          api.getProject(projectId),
          api.getKickoff(projectId),
          api.getBriefByProject(projectId),
        ]);
        if (cancelled) return;
        if (!row) {
          setProject(null);
          setError("Project not found — it may have been archived.");
          return;
        }
        const nextAnswers: Record<string, LocalAnswer> = {};
        for (const question of bundle.questions) {
          const saved = bundle.answers.find((answer) => answer.question_key === question.key);
          nextAnswers[question.key] = {
            body: saved?.body ?? "",
            status: saved?.status ?? "open",
          };
        }
        const nextScope: Record<string, boolean> = {};
        for (const system of bundle.systems) {
          nextScope[system.key] =
            bundle.scope.find((item) => item.system_key === system.key)?.in_scope ?? false;
        }
        answersRef.current = nextAnswers;
        scopeRef.current = nextScope;
        setProject(row);
        setSystems(bundle.systems);
        setQuestions(bundle.questions);
        setAnswers(nextAnswers);
        setScopeOn(nextScope);
        setBriefItems(brief?.scope_items ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load kickoff.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function queue(key: string, snapshot: LocalAnswer, immediate: boolean) {
    dirtyRef.current.add(key);
    const gen = (genRef.current[key] ?? 0) + 1;
    genRef.current[key] = gen;
    window.clearTimeout(timersRef.current[key]);
    setHints((current) => ({ ...current, [key]: "saving" }));
    const id = projectIdRef.current;
    if (!id) return;
    if (immediate) {
      void persist(id, key, snapshot, gen);
      return;
    }
    timersRef.current[key] = window.setTimeout(() => {
      void persist(id, key, snapshot, gen);
    }, SAVE_DELAY_MS);
  }

  function updateAnswer(key: string, next: LocalAnswer, immediate = false) {
    const merged = { ...answersRef.current, [key]: next };
    answersRef.current = merged;
    setAnswers(merged);
    queue(key, next, immediate);
  }

  async function onToggleScope(systemKey: string, inScope: boolean) {
    if (!projectId) return;
    const previous = scopeRef.current;
    const next = { ...previous, [systemKey]: inScope };
    scopeRef.current = next;
    setScopeOn(next);
    setScopeSaving(true);
    setError(null);
    try {
      await api.setProjectSystemScope(projectId, [{ system_key: systemKey, in_scope: inScope }]);
    } catch (err) {
      scopeRef.current = previous;
      setScopeOn(previous);
      setError(err instanceof Error ? err.message : "Could not update scope.");
    } finally {
      setScopeSaving(false);
    }
  }

  async function onAddFromBrief() {
    if (!projectId) return;
    const keys = systemKeysFromBrief(systems, briefItems).filter((key) => !scopeRef.current[key]);
    if (keys.length === 0) return;
    const previous = scopeRef.current;
    const next = { ...previous };
    for (const key of keys) next[key] = true;
    scopeRef.current = next;
    setScopeOn(next);
    setScopeSaving(true);
    setError(null);
    try {
      await api.setProjectSystemScope(
        projectId,
        keys.map((system_key) => ({ system_key, in_scope: true })),
      );
    } catch (err) {
      scopeRef.current = previous;
      setScopeOn(previous);
      setError(err instanceof Error ? err.message : "Could not update scope.");
    } finally {
      setScopeSaving(false);
    }
  }

  const inScope = useMemo(
    () => new Set(systems.filter((system) => scopeOn[system.key]).map((system) => system.key)),
    [systems, scopeOn],
  );

  const visible = useMemo(
    () => questions.filter((question) => questionIsVisible(question, inScope)),
    [questions, inScope],
  );

  const filtered = useMemo(
    () =>
      visible.filter((question) => {
        if (filter === "all") return true;
        return (answers[question.key]?.status ?? "open") === filter;
      }),
    [visible, filter, answers],
  );

  visibleKeysRef.current = filtered.map((question) => question.key);

  const counts = useMemo(() => {
    const tally = { open: 0, answered: 0, locked: 0 };
    for (const question of visible) {
      tally[answers[question.key]?.status ?? "open"] += 1;
    }
    return tally;
  }, [visible, answers]);

  const covered = useMemo(
    () => new Set(questions.flatMap((question) => question.system_keys)),
    [questions],
  );
  const held = systems.filter((system) => inScope.has(system.key) && !covered.has(system.key));
  const names = useMemo(
    () => new Map(systems.map((system) => [system.key, system.name])),
    [systems],
  );
  const briefAdds = systemKeysFromBrief(systems, briefItems).filter((key) => !scopeOn[key]);

  const sections = useMemo(() => {
    const groups: { key: string; name: string; questions: KickoffQuestion[] }[] = [];
    for (const question of filtered) {
      const last = groups[groups.length - 1];
      if (!last || last.key !== question.section_key) {
        groups.push({
          key: question.section_key,
          name: question.section_name,
          questions: [question],
        });
      } else {
        last.questions.push(question);
      }
    }
    return groups;
  }, [filtered]);

  function focusQuestion(key: string) {
    const node = document.getElementById(`kickoff-answer-${key}`);
    node?.focus();
    node?.scrollIntoView({ block: "nearest" });
  }

  function move(delta: number) {
    const keys = visibleKeysRef.current;
    if (keys.length === 0) return;
    const active = document.activeElement;
    const current =
      active instanceof HTMLElement
        ? active.closest("[data-question-key]")?.getAttribute("data-question-key")
        : null;
    const index = current ? keys.indexOf(current) : -1;
    const nextIndex =
      index === -1
        ? delta < 0
          ? keys.length - 1
          : 0
        : Math.min(keys.length - 1, Math.max(0, index + delta));
    const next = keys[nextIndex];
    if (next) focusQuestion(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const meta = event.metaKey || event.ctrlKey;
    const target = event.target;
    const inField =
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement;

    if (meta && event.key === "Enter") {
      const key = currentQuestionKey();
      if (!key) return;
      event.preventDefault();
      const current = answersRef.current[key] ?? { body: "", status: "open" };
      updateAnswer(key, { ...current, status: "answered" }, true);
      return;
    }

    if (meta && event.shiftKey && event.key.toLowerCase() === "l") {
      const key = currentQuestionKey();
      if (!key) return;
      event.preventDefault();
      const current = answersRef.current[key] ?? { body: "", status: "open" };
      const status: QuestionAnswerStatus =
        current.status === "locked" ? (current.body.trim() ? "answered" : "open") : "locked";
      updateAnswer(key, { ...current, status }, true);
      return;
    }

    if (meta && event.key.toLowerCase() === "s" && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      void flushAll();
      return;
    }

    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
      return;
    }
    if (!inField && !meta && !event.altKey && (event.key === "j" || event.key === "ArrowDown")) {
      event.preventDefault();
      move(1);
    }
    if (!inField && !meta && !event.altKey && (event.key === "k" || event.key === "ArrowUp")) {
      event.preventDefault();
      move(-1);
    }
  }

  async function onPrint() {
    await flushAll();
    window.print();
  }

  async function onDocx() {
    if (!project) return;
    setExporting(true);
    setError(null);
    try {
      await flushAll();
      const { downloadKickoffDocx } = await import("@/lib/kickoff-docx");
      await downloadKickoffDocx({
        projectName: project.name,
        owner: project.owner,
        systems,
        questions,
        scope: systems.map((system) => ({
          id: system.key,
          project_id: project.id,
          system_key: system.key,
          in_scope: Boolean(scopeRef.current[system.key]),
          created_at: project.created_at,
          updated_at: project.updated_at,
        })),
        answers: questions.map((question) => {
          const answer = answersRef.current[question.key] ?? { body: "", status: "open" as const };
          return {
            id: question.key,
            project_id: project.id,
            question_key: question.key,
            body: answer.body,
            status: answer.status,
            created_at: project.created_at,
            updated_at: project.updated_at,
          };
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the DOCX.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <p className="font-serif text-2xl text-ink-soft">Loading_</p>;
  }

  if (!project || !projectId) {
    return (
      <div>
        <ErrorText>{error || "Project not found."}</ErrorText>
        <Button className="mt-4" variant="ghost" onClick={() => navigate("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  const selected = systems.filter((system) => scopeOn[system.key]);
  const omitted = systems.filter((system) => !scopeOn[system.key]);

  return (
    <div className="print-sheet min-w-0" onKeyDown={onKeyDown}>
      <div className="print-only mb-6 border-b border-black pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
          CMPLX iT Design · Kickoff questionnaire
        </p>
        <h1 className="mt-2 font-serif text-4xl">{project.name}</h1>
        <p className="mt-2 text-sm">
          Owner {project.owner} · Printed {formatDate(new Date().toISOString().slice(0, 10))}
        </p>
        <p className="mt-3 text-sm leading-6">
          <span className="font-medium">In scope. </span>
          {selected.length
            ? selected.map((system) => system.name).join(" · ")
            : "None selected."}
        </p>
        <p className="text-sm leading-6">
          <span className="font-medium">Not in this pass. </span>
          {omitted.length ? omitted.map((system) => system.name).join(" · ") : "None."}
        </p>
        {held.length ? (
          <p className="text-sm leading-6">
            <span className="font-medium">Held for discovery. </span>
            {held.map((system) => system.name).join(" · ")}{" "}
            {held.length === 1 ? "has" : "have"} no kickoff questions yet.
          </p>
        ) : null}
      </div>

      <div className="no-print mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            <Link to={`/projects/${project.id}`} className="hover:underline">
              {project.name}
            </Link>{" "}
            · Kickoff
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Questionnaire_</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Scope selects which questions show. Answers autosave. The same systems drive the
            per-space checklist on{" "}
            <Link className="underline underline-offset-2" to={`/projects/${project.id}/discovery`}>
              Discovery
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => void onPrint()}>
            Print / PDF
          </Button>
          <Button type="button" variant="ghost" onClick={() => void onDocx()} disabled={exporting}>
            {exporting ? "Preparing DOCX…" : "Download DOCX"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(`/projects/${project.id}`)}>
            Back
          </Button>
        </div>
      </div>

      <div className="no-print">
        <ErrorText>{error}</ErrorText>
      </div>

      <div className="no-print mt-6 grid min-w-0 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="min-w-0 lg:sticky lg:top-6">
          <fieldset className="rounded-sm border border-rule bg-white p-4">
            <legend className="px-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              Scope
            </legend>
            <p className="mb-3 text-xs leading-5 text-ink-soft">
              Project systems are kickoff. Space systems also feed the per-space discovery
              checklist. A question shows when any of its systems is on.
            </p>
            <ul className="space-y-2">
              {systems.map((system) => (
                <li key={system.key}>
                  <label className="flex cursor-pointer gap-2 text-sm leading-5">
                    <input
                      type="checkbox"
                      className="mt-1 accent-ink"
                      checked={Boolean(scopeOn[system.key])}
                      onChange={(event) => void onToggleScope(system.key, event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{system.name}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        {APPLIES_TO_LABEL[system.applies_to]}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              className="mt-4 w-full"
              disabled={briefAdds.length === 0 || scopeSaving}
              onClick={() => void onAddFromBrief()}
            >
              {briefItems.length === 0 ? "No brief checklist yet" : "Add systems from the brief"}
            </Button>
            {held.length ? (
              <p className="mt-3 text-xs leading-5 text-ink-soft">
                Held for discovery: {held.map((system) => system.name).join(", ")}. In scope, with
                no kickoff questions yet.
              </p>
            ) : null}
          </fieldset>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-ink-soft">
              {visible.length === 0
                ? "No questions in scope."
                : `${counts.answered + counts.locked} of ${visible.length} answered or locked · ${counts.open} open`}
            </p>
            <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Filter questions">
              {(
                [
                  ["all", "All"],
                  ["open", "Open"],
                  ["answered", "Answered"],
                  ["locked", "Locked"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  className={
                    filter === value
                      ? "rounded-sm bg-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper"
                      : "rounded-sm border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft hover:bg-paper-2"
                  }
                  onClick={() => setFilter(value)}
                >
                  {label}
                  {value === "all" ? "" : ` ${counts[value]}`}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 max-w-full break-words font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-ink-soft">
            Alt+↑/↓ moves · ⌘/Ctrl+Enter answered · ⌘/Ctrl+Shift+L locks · ⌘/Ctrl+S saves · j/k
            outside a field
          </p>

          {visible.length === 0 ? (
            <p className="mt-6 rounded-sm border border-dashed border-rule bg-white/60 px-4 py-8 text-sm leading-6 text-ink-soft">
              Turn on a system to show its questions. Acoustics and the other space systems can be
              in scope now even when the kickoff bank has nothing for them yet.
            </p>
          ) : null}

          {visible.length > 0 && filtered.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">Nothing in this filter.</p>
          ) : null}

          <div className="mt-4 space-y-8">
            {sections.map((section) => (
              <section key={section.key} aria-labelledby={`kickoff-section-${section.key}`}>
                <h2
                  id={`kickoff-section-${section.key}`}
                  className="font-serif text-3xl tracking-tight"
                >
                  {section.name}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.questions.map((question) => {
                    const answer = answers[question.key] ?? { body: "", status: "open" as const };
                    const hint = hints[question.key];
                    return (
                      <article
                        key={question.key}
                        data-question-key={question.key}
                        className="min-w-0 rounded-sm border border-rule bg-white p-4"
                      >
                        <h3 className="break-words text-sm font-medium leading-6">{question.prompt}</h3>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                          {question.system_keys.map((key) => names.get(key) ?? key).join(" · ")}
                        </p>
                        <div
                          className="mt-3 flex flex-wrap gap-1"
                          role="radiogroup"
                          aria-label="Answer status"
                        >
                          {QUESTION_ANSWER_STATUSES.map((status) => {
                            const selectedStatus = answer.status === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                role="radio"
                                aria-checked={selectedStatus}
                                className={
                                  selectedStatus
                                    ? status === "locked"
                                      ? "rounded-sm bg-copper-deep px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper"
                                      : status === "answered"
                                        ? "rounded-sm bg-emerald-800 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white"
                                        : "rounded-sm bg-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper"
                                    : "rounded-sm border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft hover:bg-paper-2"
                                }
                                onClick={() =>
                                  updateAnswer(question.key, { ...answer, status }, true)
                                }
                              >
                                {ANSWER_STATUS_LABEL[status]}
                              </button>
                            );
                          })}
                        </div>
                        <label className="mt-3 block" htmlFor={`kickoff-answer-${question.key}`}>
                          <span className="sr-only">Answer</span>
                          <textarea
                            id={`kickoff-answer-${question.key}`}
                            className={
                              answer.status === "locked"
                                ? `${fieldControlClass} min-w-0 max-w-full bg-paper-2`
                                : `${fieldControlClass} min-w-0 max-w-full`
                            }
                            rows={3}
                            maxLength={8000}
                            readOnly={answer.status === "locked"}
                            value={answer.body}
                            onChange={(event) =>
                              updateAnswer(question.key, { ...answer, body: event.target.value })
                            }
                            onBlur={() => void flushKey(question.key)}
                          />
                        </label>
                        <p className="mt-1 min-h-4 text-xs text-ink-soft" aria-live="polite">
                          {hint === "saving"
                            ? "Saving…"
                            : hint === "saved"
                              ? "Saved"
                              : hint === "error"
                                ? "Not saved"
                                : answer.status === "locked"
                                  ? "Locked. Choose Open or Answered to edit."
                                  : ""}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <article className="kickoff-print print-only">
        {visible.length === 0 ? (
          <p className="text-sm">No questions are in scope.</p>
        ) : (
          groupSections(visible).map((section) => (
            <section key={section.key} className="mt-6">
              <h2 className="font-serif text-2xl">{section.name}</h2>
              {section.questions.map((question) => {
                const answer = answers[question.key] ?? { body: "", status: "open" as const };
                return (
                  <div key={question.key} className="kickoff-qa mt-4">
                    <h3 className="text-sm font-medium leading-6">{question.prompt}</h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                      {ANSWER_STATUS_LABEL[answer.status]}
                      {" · "}
                      {question.system_keys.map((key) => names.get(key) ?? key).join(" · ")}
                    </p>
                    <p className="kickoff-answer mt-2 text-sm leading-6">
                      {exportAnswerText(answer.body)}
                    </p>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </article>
    </div>
  );
}

function currentQuestionKey(): string | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  return active.closest("[data-question-key]")?.getAttribute("data-question-key") ?? null;
}

function groupSections(questions: KickoffQuestion[]) {
  const groups: { key: string; name: string; questions: KickoffQuestion[] }[] = [];
  for (const question of questions) {
    const last = groups[groups.length - 1];
    if (!last || last.key !== question.section_key) {
      groups.push({ key: question.section_key, name: question.section_name, questions: [question] });
    } else {
      last.questions.push(question);
    }
  }
  return groups;
}
