import { formatDate, todayIsoDate } from "./dates";
import { SEVERITY_LABEL, flattenSpaces } from "./discovery";
import { PROJECT_STATUS_META } from "./status";
import { ANSWER_STATUS_LABEL } from "./systems";
import type {
  DiscoveryAttachment,
  DiscoveryDiscrepancy,
  DiscoveryDiscrepancyDraft,
  DiscoverySeverity,
  DiscoverySpace,
  DiscoverySpaceDraft,
  KickoffQuestion,
  Project,
  QuestionAnswerStatus,
} from "./types";

export type GuideImage = {
  url: string;
  fileName: string;
  contentType: string;
};

export type GuideQuestion = {
  key: string;
  prompt: string;
  status: QuestionAnswerStatus;
  statusLabel: string;
  body: string;
};

export type GuideSection = {
  key: string;
  name: string;
  questions: GuideQuestion[];
};

export type GuideSpace = {
  id: string;
  name: string;
  groupLabel: string;
  planShows: string;
  intendedUse: string;
  occupancy: string;
  notes: string;
  image: GuideImage | null;
  sections: GuideSection[];
};

export type GuideGap = {
  id: string;
  spaceName: string | null;
  planShows: string;
  notesSay: string;
  severity: DiscoverySeverity;
  severityLabel: string;
  status: "open" | "resolved";
  statusLabel: string;
  resolutionNote: string;
};

export type SpaceGuideModel = {
  projectName: string;
  owner: string;
  statusLabel: string;
  schedule: string;
  areaLabel: string;
  systemsLabel: string;
  statusNote: string | null;
  printedOn: string;
  spaces: GuideSpace[];
  gaps: GuideGap[];
};

type LocalAnswer = { body: string; status: QuestionAnswerStatus };

export type SpaceGuideSource = {
  project: Project;
  statusNote: string | null;
  spaces: DiscoverySpace[];
  drafts: Record<string, DiscoverySpaceDraft>;
  attachments: DiscoveryAttachment[];
  questions: KickoffQuestion[];
  answers: Record<string, LocalAnswer>;
  gaps: DiscoveryDiscrepancy[];
  gapDrafts: Record<string, DiscoveryDiscrepancyDraft>;
  systemsInScope: string[];
};

const SEVERITY_RANK: Record<DiscoverySeverity, number> = { high: 0, medium: 1, low: 2 };

export function readAreaSf(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

export function formatAreaSf(value: unknown): string {
  const area = readAreaSf(value);
  if (area == null) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(area)} sf`;
}

function scheduleLabel(start: string | null, target: string | null): string {
  if (start && target) return `${formatDate(start)} – ${formatDate(target)}`;
  if (target) return `Target ${formatDate(target)}`;
  if (start) return `Start ${formatDate(start)}`;
  return "—";
}

function textOrDash(value: string): string {
  const trimmed = value.trim();
  return trimmed || "—";
}

function sectionGroups(questions: KickoffQuestion[]): { key: string; name: string; questions: KickoffQuestion[] }[] {
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

function guideImage(
  attachmentId: string | null,
  attachments: DiscoveryAttachment[],
): GuideImage | null {
  if (!attachmentId) return null;
  const file = attachments.find((item) => item.id === attachmentId && !item.deleted_at);
  if (!file || file.kind !== "rendering" || !file.signed_url) return null;
  if (!file.content_type.startsWith("image/")) return null;
  return { url: file.signed_url, fileName: file.file_name, contentType: file.content_type };
}

export function buildSpaceGuide(source: SpaceGuideSource): SpaceGuideModel {
  const ordered = flattenSpaces(source.spaces);
  const sections = sectionGroups(source.questions);
  const spaces: GuideSpace[] = ordered.map((space) => {
    const draft = source.drafts[space.id];
    const name = draft?.name.trim() || space.name;
    const group = (draft?.group_name ?? space.group_name).trim();
    return {
      id: space.id,
      name,
      groupLabel: group || "Ungrouped",
      planShows: textOrDash(draft?.plan_shows ?? space.plan_shows),
      intendedUse: textOrDash(draft?.intended_use ?? space.intended_use),
      occupancy: textOrDash(draft?.occupancy ?? space.occupancy),
      notes: (draft?.notes ?? space.notes).trim(),
      image: guideImage(draft?.thumbnail_attachment_id ?? space.thumbnail_attachment_id, source.attachments),
      sections: sections.map((section) => ({
        key: section.key,
        name: section.name,
        questions: section.questions.map((question) => {
          const answer = source.answers[`${space.id}:${question.key}`];
          const status = answer?.status ?? "open";
          return {
            key: question.key,
            prompt: question.prompt,
            status,
            statusLabel: ANSWER_STATUS_LABEL[status],
            body: answer?.body ?? "",
          };
        }),
      })),
    };
  });

  const gaps = source.gaps.map((gap, index) => {
    const draft = source.gapDrafts[gap.id];
    const plan = draft?.plan_shows ?? gap.plan_shows;
    const notes = draft?.notes_say ?? gap.notes_say;
    const useSaved = !plan.trim() && !notes.trim();
    const spaceId = useSaved ? gap.space_id : (draft?.space_id ?? gap.space_id);
    const space = spaceId ? ordered.find((item) => item.id === spaceId) : undefined;
    const spaceDraft = space ? source.drafts[space.id] : undefined;
    const spaceName = space
      ? spaceDraft?.name.trim() || space.name
      : spaceId
        ? gap.space_name
        : null;
    const status = useSaved ? gap.status : (draft?.status ?? gap.status);
    const severity = useSaved ? gap.severity : (draft?.severity ?? gap.severity);
    return {
      index,
      id: gap.id,
      spaceName,
      planShows: (useSaved ? gap.plan_shows : plan).trim(),
      notesSay: (useSaved ? gap.notes_say : notes).trim(),
      severity,
      severityLabel: SEVERITY_LABEL[severity],
      status,
      statusLabel: status === "resolved" ? "Resolved" : "Open",
      resolutionNote: (useSaved ? gap.resolution_note : (draft?.resolution_note ?? gap.resolution_note)).trim(),
    };
  });
  gaps.sort((a, b) => {
    const status = (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1);
    if (status !== 0) return status;
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    return a.index - b.index;
  });

  const note = source.statusNote?.trim() || null;
  return {
    projectName: source.project.name,
    owner: source.project.owner.trim() || "—",
    statusLabel: PROJECT_STATUS_META[source.project.status].label,
    schedule: scheduleLabel(source.project.start_date, source.project.target_date),
    areaLabel: formatAreaSf(source.project.area_sf),
    systemsLabel: source.systemsInScope.length ? source.systemsInScope.join(" · ") : "None selected.",
    statusNote: note,
    printedOn: formatDate(todayIsoDate()),
    spaces,
    gaps: gaps.map((gap) => ({
      id: gap.id,
      spaceName: gap.spaceName,
      planShows: gap.planShows,
      notesSay: gap.notesSay,
      severity: gap.severity,
      severityLabel: gap.severityLabel,
      status: gap.status,
      statusLabel: gap.statusLabel,
      resolutionNote: gap.resolutionNote,
    })),
  };
}

export function summaryRows(model: SpaceGuideModel): [string, string][] {
  const rows: [string, string][] = [
    ["Project", model.projectName],
    ["Owner", model.owner],
    ["Status", model.statusLabel],
    ["Area", model.areaLabel],
    ["Schedule", model.schedule],
    ["In scope", model.systemsLabel],
  ];
  if (model.statusNote) rows.push(["Status note", model.statusNote]);
  return rows;
}

export function buildDiscoveryAgenda(model: SpaceGuideModel): string {
  const lines: string[] = [
    "AV/IT discovery agenda",
    model.projectName,
    model.printedOn,
    "",
    "OPEN QUESTIONS",
    "",
  ];
  let anyQuestion = false;
  let group = "";
  for (const space of model.spaces) {
    const sections = space.sections
      .map((section) => ({
        ...section,
        questions: section.questions.filter((question) => question.status === "open"),
      }))
      .filter((section) => section.questions.length > 0);
    if (sections.length === 0) continue;
    anyQuestion = true;
    if (space.groupLabel !== group) {
      if (group) lines.push("");
      group = space.groupLabel;
      lines.push(group.toUpperCase());
      lines.push("");
    }
    lines.push(space.name);
    for (const section of sections) {
      lines.push(section.name);
      for (const question of section.questions) {
        lines.push(`- ${question.prompt}`);
        const body = question.body.trim();
        if (body) {
          for (const line of body.split("\n")) lines.push(`  ${line}`);
        }
      }
      lines.push("");
    }
  }
  if (!anyQuestion) lines.push("No open questions.", "");

  lines.push("OPEN DISCREPANCIES", "");
  const openGaps = model.gaps.filter((gap) => gap.status === "open");
  if (openGaps.length === 0) {
    lines.push("No open discrepancies.");
  } else {
    openGaps.forEach((gap, index) => {
      lines.push(`${index + 1}. ${gap.severityLabel} — ${gap.spaceName ?? "Project"}`);
      lines.push(`Plan: ${gap.planShows || "—"}`);
      lines.push(`Notes: ${gap.notesSay || "—"}`);
      lines.push("");
    });
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function spaceGuideBasename(projectName: string): string {
  const safe = projectName
    .replace(/[^\w\s.'’\u2014-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return safe || "Project";
}

export function spaceGuideDocxFilename(projectName: string): string {
  return `${spaceGuideBasename(projectName)} — space guide.docx`;
}

export function discoveryAgendaFilename(projectName: string): string {
  return `${spaceGuideBasename(projectName)} — discovery agenda.txt`;
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
