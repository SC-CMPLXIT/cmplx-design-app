import { useEffect, useRef, useState } from "react";
import { answerKey, flattenSpaces } from "@/lib/discovery";
import { ANSWER_STATUS_LABEL } from "@/lib/systems";
import type {
  DiscoveryAttachment,
  DiscoverySpace,
  DiscoverySpaceDraft,
  KickoffQuestion,
  QuestionAnswerStatus,
} from "@/lib/types";
import type { SaveHint } from "@/lib/use-autosave";
import { Button, fieldControlClass } from "./ui";
import { SaveLine } from "./DiscoveryBits";

type LocalAnswer = { body: string; status: QuestionAnswerStatus };

export function DiscoveryCall({
  spaces,
  attachments,
  questions,
  selectedId,
  drafts,
  answers,
  spaceHints,
  answerHints,
  onSelect,
  onNotes,
  onAnswer,
  onExit,
  onEditSpace,
}: {
  spaces: DiscoverySpace[];
  attachments: DiscoveryAttachment[];
  questions: KickoffQuestion[];
  selectedId: string | null;
  drafts: Record<string, DiscoverySpaceDraft>;
  answers: Record<string, LocalAnswer>;
  spaceHints: Record<string, SaveHint>;
  answerHints: Record<string, SaveHint>;
  onSelect: (spaceId: string) => void;
  onNotes: (spaceId: string, notes: string, immediate?: boolean) => void;
  onAnswer: (
    spaceId: string,
    questionKey: string,
    next: LocalAnswer,
    immediate?: boolean,
  ) => void;
  onExit: () => void;
  onEditSpace: () => void;
}) {
  const ordered = flattenSpaces(spaces);
  const space = ordered.find((item) => item.id === selectedId) ?? ordered[0] ?? null;
  const draft = space ? drafts[space.id] : undefined;
  const [index, setIndex] = useState(0);
  const [trackedSpace, setTrackedSpace] = useState(space?.id ?? "");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const spaceRef = useRef(space);
  spaceRef.current = space;
  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;

  if ((space?.id ?? "") !== trackedSpace) {
    setTrackedSpace(space?.id ?? "");
    setIndex(0);
  }
  const safeIndex = questions.length === 0 ? 0 : Math.min(index, questions.length - 1);
  const indexRef = useRef(safeIndex);
  indexRef.current = safeIndex;
  const question = questions[safeIndex] ?? null;
  const answer = space && question
    ? answers[answerKey(space.id, question.key)] ?? { body: "", status: "open" as const }
    : { body: "", status: "open" as const };
  const locked = answer.status === "locked";
  const done = space
    ? questions.filter((item) => {
        const status = answers[answerKey(space.id, item.key)]?.status ?? "open";
        return status === "answered" || status === "locked";
      }).length
    : 0;
  const thumb = attachments.find((file) => file.id === space?.thumbnail_attachment_id);
  const spaceIndex = space ? ordered.findIndex((item) => item.id === space.id) : -1;

  function goSpace(delta: number) {
    const list = orderedRef.current;
    if (list.length === 0) return;
    const current = spaceRef.current;
    const at = current ? list.findIndex((item) => item.id === current.id) : 0;
    const next = list[(at + delta + list.length) % list.length];
    if (next) onSelect(next.id);
  }

  function goQuestion(delta: number) {
    const list = questionsRef.current;
    if (list.length === 0) return;
    setIndex((current) => {
      const base = Math.min(current, list.length - 1);
      return (base + delta + list.length) % list.length;
    });
  }

  function markAnswered() {
    const currentSpace = spaceRef.current;
    const list = questionsRef.current;
    const currentQuestion = list[indexRef.current];
    if (!currentSpace || !currentQuestion) return;
    const key = answerKey(currentSpace.id, currentQuestion.key);
    const current = answersRef.current[key] ?? { body: "", status: "open" as const };
    if (current.status === "locked") return;
    onAnswer(currentSpace.id, currentQuestion.key, { ...current, status: "answered" }, true);
  }

  const actionsRef = useRef({ goSpace, goQuestion, markAnswered });
  actionsRef.current = { goSpace, goQuestion, markAnswered };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (event.key === "Escape" && typing) {
        event.preventDefault();
        (target as HTMLElement).blur();
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const actions = actionsRef.current;
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        actions.goQuestion(1);
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        actions.goQuestion(-1);
      } else if (event.key === "ArrowRight" || event.key === "]") {
        event.preventDefault();
        actions.goSpace(1);
      } else if (event.key === "ArrowLeft" || event.key === "[") {
        event.preventDefault();
        actions.goSpace(-1);
      } else if (event.key === "a") {
        event.preventDefault();
        actions.markAnswered();
      } else if (event.key === "n") {
        event.preventDefault();
        notesRef.current?.focus();
      } else if (event.key === "Enter") {
        event.preventDefault();
        answerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.getElementById("discovery-call-question")?.scrollIntoView({ block: "nearest" });
  }, [safeIndex, space?.id]);

  if (!space || !draft) {
    return (
      <div>
        <p className="text-sm leading-6 text-ink-soft">Add a room before starting the call.</p>
        <Button type="button" className="mt-4" variant="ghost" onClick={onExit}>
          Back to discovery
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">Live call</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onEditSpace}>
            Edit room
          </Button>
          <Button type="button" variant="ghost" onClick={onExit}>
            Leave call
          </Button>
        </div>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <label className="block lg:hidden">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              Room
            </span>
            <select
              className={fieldControlClass}
              value={space.id}
              onChange={(event) => onSelect(event.target.value)}
            >
              {ordered.map((item) => (
                <option key={item.id} value={item.id}>
                  {(item.group_name.trim() ? `${item.group_name} · ` : "") + item.name}
                </option>
              ))}
            </select>
          </label>
          <ol className="hidden space-y-1 lg:block">
            {ordered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    item.id === space.id
                      ? "w-full break-words rounded-sm bg-ink px-2 py-1.5 text-left text-sm text-paper"
                      : "w-full break-words rounded-sm px-2 py-1.5 text-left text-sm hover:bg-paper-2"
                  }
                  onClick={() => onSelect(item.id)}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ol>
        </aside>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            {space.group_name.trim() || "Ungrouped"} · Room {spaceIndex + 1} of {ordered.length}
            {questions.length ? ` · ${done} of ${questions.length} answered` : ""}
          </p>
          <h2 className="mt-1 break-words font-serif text-4xl tracking-tight sm:text-5xl">
            {space.name}
          </h2>
          <dl className="mt-4 space-y-2 text-sm leading-6">
            <div>
              <dt className="font-medium">Plan shows</dt>
              <dd className="whitespace-pre-wrap text-ink-soft">{space.plan_shows || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium">Intended use</dt>
              <dd className="whitespace-pre-wrap">{space.intended_use || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium">Occupancy</dt>
              <dd>{space.occupancy || "—"}</dd>
            </div>
          </dl>
          {thumb?.signed_url ? (
            <img
              src={thumb.signed_url}
              alt=""
              className="mt-4 max-h-48 w-full rounded-sm border border-rule object-contain"
            />
          ) : null}
          <label className="mt-4 block" htmlFor="discovery-call-notes">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              Quick notes
            </span>
            <textarea
              id="discovery-call-notes"
              ref={notesRef}
              className={fieldControlClass}
              rows={3}
              maxLength={8000}
              value={draft.notes}
              onChange={(event) => onNotes(space.id, event.target.value)}
              onBlur={() => onNotes(space.id, draft.notes, true)}
            />
          </label>
          <SaveLine hint={spaceHints[space.id]} />

          {questions.length === 0 ? (
            <p className="mt-6 text-sm leading-6 text-ink-soft">
              No questions for the systems in scope. You can still take notes and move between rooms.
            </p>
          ) : question ? (
            <article
              id="discovery-call-question"
              className="mt-4 min-w-0 rounded-sm border border-ink bg-white p-4 sm:p-5"
              aria-live="polite"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                {question.section_name} · Question {safeIndex + 1} of {questions.length} ·{" "}
                {ANSWER_STATUS_LABEL[answer.status]}
              </p>
              <h3 className="mt-2 break-words font-serif text-2xl leading-snug sm:text-3xl">
                {question.prompt}
              </h3>
              <label className="mt-4 block" htmlFor="discovery-call-answer">
                <span className="sr-only">Answer</span>
                <textarea
                  id="discovery-call-answer"
                  ref={answerRef}
                  className={locked ? `${fieldControlClass} bg-paper-2 text-base` : `${fieldControlClass} text-base`}
                  rows={4}
                  maxLength={8000}
                  readOnly={locked}
                  value={answer.body}
                  onChange={(event) =>
                    onAnswer(space.id, question.key, { ...answer, body: event.target.value })
                  }
                  onBlur={() => onAnswer(space.id, question.key, answer, true)}
                />
              </label>
              <SaveLine hint={answerHints[answerKey(space.id, question.key)]} locked={locked} />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" disabled={locked} onClick={markAnswered}>
                  Mark answered
                </Button>
                <Button type="button" variant="ghost" onClick={() => goQuestion(-1)}>
                  Previous
                </Button>
                <Button type="button" variant="ghost" onClick={() => goQuestion(1)}>
                  Next
                </Button>
              </div>
            </article>
          ) : null}
        </div>
      </div>
      <p className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-rule bg-paper/95 px-4 py-2 font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-ink-soft backdrop-blur sm:-mx-6 sm:px-6">
        j/k or ↑↓ questions · ←→ or [ ] rooms · a answered · n notes · enter types · esc leaves a field
      </p>
    </div>
  );
}
