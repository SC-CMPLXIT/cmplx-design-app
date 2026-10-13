import type { QuestionAnswerStatus } from "@/lib/types";
import type { SaveHint } from "@/lib/use-autosave";
import { ANSWER_STATUS_LABEL } from "@/lib/systems";
import { QUESTION_ANSWER_STATUSES } from "@/lib/types";

export function statusButtonClass(status: QuestionAnswerStatus, selected: boolean): string {
  if (!selected) {
    return "rounded-sm border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft hover:bg-paper-2";
  }
  if (status === "locked") {
    return "rounded-sm bg-copper-deep px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper";
  }
  if (status === "answered") {
    return "rounded-sm bg-emerald-800 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white";
  }
  return "rounded-sm bg-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper";
}

export function AnswerStatus({
  status,
  onChange,
  label = "Answer status",
}: {
  status: QuestionAnswerStatus;
  onChange: (status: QuestionAnswerStatus) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
      {QUESTION_ANSWER_STATUSES.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={status === value}
          className={statusButtonClass(value, status === value)}
          onClick={() => onChange(value)}
        >
          {ANSWER_STATUS_LABEL[value]}
        </button>
      ))}
    </div>
  );
}

export function SaveLine({ hint, locked }: { hint?: SaveHint; locked?: boolean }) {
  const text =
    hint === "saving"
      ? "Saving…"
      : hint === "saved"
        ? "Saved"
        : hint === "error"
          ? "Not saved"
          : locked
            ? "Locked. Choose Open or Answered to edit."
            : "";
  return (
    <p className="mt-1 min-h-4 text-xs text-ink-soft" aria-live="polite">
      {text}
    </p>
  );
}
