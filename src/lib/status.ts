import type { BriefStatus, ProjectStatus } from "./types";

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-stone-200 text-stone-800 print:border print:border-stone-400",
  },
  on_track: {
    label: "On track",
    className: "bg-emerald-100 text-emerald-900 print:border print:border-emerald-700",
  },
  at_risk: {
    label: "At risk",
    className: "bg-amber-100 text-amber-950 print:border print:border-amber-700",
  },
  behind: {
    label: "Behind",
    className: "bg-rose-100 text-rose-950 print:border print:border-rose-700",
  },
};

export const BRIEF_STATUS_META: Record<
  BriefStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-stone-200 text-stone-800 print:border print:border-stone-400",
  },
  active: {
    label: "Active",
    className: "bg-sky-100 text-sky-950 print:border print:border-sky-700",
  },
  in_review: {
    label: "In review",
    className: "bg-amber-100 text-amber-950 print:border print:border-amber-700",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-900 print:border print:border-emerald-700",
  },
};
