import { cn } from "@/lib/cn";
import { BRIEF_STATUS_META, PROJECT_STATUS_META } from "@/lib/status";
import type { BriefStatus, ProjectStatus } from "@/lib/types";

export function StatusPill({
  status,
  kind = "project",
}: {
  status: ProjectStatus | BriefStatus;
  kind?: "project" | "brief";
}) {
  const meta =
    kind === "brief"
      ? BRIEF_STATUS_META[status as BriefStatus]
      : PROJECT_STATUS_META[status as ProjectStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}
