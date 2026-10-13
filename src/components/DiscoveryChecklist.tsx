import { Link } from "react-router-dom";
import { answerKey, groupSpaces } from "@/lib/discovery";
import { ANSWER_STATUS_LABEL, systemAppliesToSpace } from "@/lib/systems";
import type {
  DiscoverySpace,
  KickoffQuestion,
  QuestionAnswerStatus,
  TechnologySystem,
} from "@/lib/types";
import type { SaveHint } from "@/lib/use-autosave";
import { fieldControlClass } from "./ui";
import { AnswerStatus, SaveLine } from "./DiscoveryBits";

type LocalAnswer = { body: string; status: QuestionAnswerStatus };

export function DiscoveryChecklist({
  projectId,
  spaces,
  systems,
  questions,
  inScope,
  selectedId,
  answers,
  hints,
  onSelect,
  onAnswer,
}: {
  projectId: string;
  spaces: DiscoverySpace[];
  systems: TechnologySystem[];
  questions: KickoffQuestion[];
  inScope: ReadonlySet<string>;
  selectedId: string | null;
  answers: Record<string, LocalAnswer>;
  hints: Record<string, SaveHint>;
  onSelect: (spaceId: string) => void;
  onAnswer: (
    spaceId: string,
    questionKey: string,
    next: LocalAnswer,
    immediate?: boolean,
  ) => void;
}) {
  const groups = groupSpaces(spaces);
  const space = spaces.find((item) => item.id === selectedId) ?? null;
  const spaceSystems = systems.filter(
    (system) => systemAppliesToSpace(system.applies_to) && inScope.has(system.key),
  );
  const held = systems.filter(
    (system) => systemAppliesToSpace(system.applies_to) && !inScope.has(system.key),
  );
  const sections = sectionGroups(questions);
  const answered = space
    ? questions.filter((question) => {
        const status = answers[answerKey(space.id, question.key)]?.status ?? "open";
        return status === "answered" || status === "locked";
      }).length
    : 0;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Rooms</p>
        {spaces.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-ink-soft">Add a room before the checklist.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {groups.map((group) => (
              <div key={group.name || "ungrouped"}>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {group.label}
                </p>
                <ul className="mt-1 space-y-1">
                  {group.spaces.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={
                          item.id === space?.id
                            ? "w-full break-words rounded-sm bg-ink px-2.5 py-1.5 text-left text-sm text-paper"
                            : "w-full break-words rounded-sm px-2.5 py-1.5 text-left text-sm hover:bg-paper-2"
                        }
                        onClick={() => onSelect(item.id)}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </aside>
      <div className="min-w-0">
        {!space ? (
          <p className="rounded-sm border border-dashed border-rule bg-white/60 px-4 py-8 text-sm leading-6 text-ink-soft">
            Add a room, then walk the questions for the systems that are in scope.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words font-serif text-3xl">{space.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {questions.length === 0
                    ? "No space questions for the systems in scope."
                    : `${answered} of ${questions.length} answered or locked`}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              {spaceSystems.length
                ? `In scope: ${spaceSystems.map((system) => system.name).join(", ")}.`
                : "No space systems are in scope."}{" "}
              {held.length
                ? `Off: ${held.map((system) => system.name).join(", ")}. `
                : ""}
              <Link className="underline underline-offset-2" to={`/projects/${projectId}/kickoff`}>
                Change scope on Kickoff
              </Link>
              .
            </p>
            {space.plan_shows ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                <span className="font-medium">Plan shows. </span>
                {space.plan_shows}
              </p>
            ) : null}
            <div className="mt-6 space-y-8">
              {sections.map((section) => (
                <section key={section.key}>
                  <h3 className="font-serif text-2xl">{section.name}</h3>
                  <div className="mt-3 space-y-4">
                    {section.questions.map((question) => {
                      const key = answerKey(space.id, question.key);
                      const answer = answers[key] ?? { body: "", status: "open" as const };
                      const locked = answer.status === "locked";
                      return (
                        <article key={question.key} className="min-w-0 rounded-sm border border-rule bg-white p-4">
                          <h4 className="break-words text-sm font-medium leading-6">{question.prompt}</h4>
                          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                            {ANSWER_STATUS_LABEL[answer.status]}
                          </p>
                          <div className="mt-3">
                            <AnswerStatus
                              status={answer.status}
                              onChange={(status) =>
                                onAnswer(space.id, question.key, { ...answer, status }, true)
                              }
                            />
                          </div>
                          <label className="mt-3 block" htmlFor={`discovery-answer-${key}`}>
                            <span className="sr-only">Answer</span>
                            <textarea
                              id={`discovery-answer-${key}`}
                              className={
                                locked
                                  ? `${fieldControlClass} bg-paper-2`
                                  : fieldControlClass
                              }
                              rows={3}
                              maxLength={8000}
                              readOnly={locked}
                              value={answer.body}
                              onChange={(event) =>
                                onAnswer(space.id, question.key, {
                                  ...answer,
                                  body: event.target.value,
                                })
                              }
                              onBlur={() => onAnswer(space.id, question.key, answer, true)}
                            />
                          </label>
                          <SaveLine hint={hints[key]} locked={locked && !hints[key]} />
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function sectionGroups(questions: KickoffQuestion[]) {
  const groups: { key: string; name: string; questions: KickoffQuestion[] }[] = [];
  for (const question of questions) {
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
}
