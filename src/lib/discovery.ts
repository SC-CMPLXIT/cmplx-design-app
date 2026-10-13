import { KICKOFF_ANSWER_LIMIT, questionIsVisible, systemAppliesToSpace } from "./systems";
import type {
  DiscoveryAttachmentKind,
  DiscoveryDiscrepancyDraft,
  DiscoverySeverity,
  DiscoverySpace,
  DiscoverySpaceDraft,
  KickoffQuestion,
  SystemAppliesTo,
} from "./types";

export const DISCOVERY_BUCKET = "discovery";
export const DISCOVERY_SIGNED_URL_SECONDS = 60 * 60 * 2;
export const DISCOVERY_FILE_BYTE_LIMIT = 20 * 1024 * 1024;
export const DISCOVERY_ANSWER_LIMIT = KICKOFF_ANSWER_LIMIT;

export const DISCOVERY_LIMITS = {
  name: 160,
  group: 80,
  planShows: 2000,
  intendedUse: 2000,
  occupancy: 160,
  notes: 8000,
  fileName: 200,
  discrepancy: 2000,
} as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function answerKey(spaceId: string, questionKey: string): string {
  return `${spaceId}:${questionKey}`;
}

export function spaceDraftFrom(space: DiscoverySpace): DiscoverySpaceDraft {
  return {
    name: space.name,
    group_name: space.group_name,
    plan_shows: space.plan_shows,
    intended_use: space.intended_use,
    occupancy: space.occupancy,
    notes: space.notes,
    thumbnail_attachment_id: space.thumbnail_attachment_id,
  };
}

export function prepareSpaceDraft(draft: DiscoverySpaceDraft): DiscoverySpaceDraft {
  const name = draft.name.trim();
  if (!name) throw new Error("A space needs a name.");
  if (name.length > DISCOVERY_LIMITS.name) throw new Error("Space name is too long.");
  const group_name = draft.group_name.trim();
  if (group_name.length > DISCOVERY_LIMITS.group) throw new Error("Group name is too long.");
  const plan_shows = draft.plan_shows;
  const intended_use = draft.intended_use;
  const occupancy = draft.occupancy.trim();
  const notes = draft.notes;
  if (plan_shows.length > DISCOVERY_LIMITS.planShows) throw new Error("Plan shows is too long.");
  if (intended_use.length > DISCOVERY_LIMITS.intendedUse) {
    throw new Error("Intended use is too long.");
  }
  if (occupancy.length > DISCOVERY_LIMITS.occupancy) throw new Error("Occupancy is too long.");
  if (notes.length > DISCOVERY_LIMITS.notes) throw new Error("Notes are too long.");
  return {
    name,
    group_name,
    plan_shows,
    intended_use,
    occupancy,
    notes,
    thumbnail_attachment_id: draft.thumbnail_attachment_id,
  };
}

export function prepareDiscrepancyDraft(
  draft: DiscoveryDiscrepancyDraft,
): DiscoveryDiscrepancyDraft {
  const plan_shows = draft.plan_shows;
  const notes_say = draft.notes_say;
  const resolution_note = draft.resolution_note;
  if (!plan_shows.trim() && !notes_say.trim()) {
    throw new Error("Say what the plan shows or what the notes say.");
  }
  if (plan_shows.length > DISCOVERY_LIMITS.discrepancy) {
    throw new Error("Plan shows is too long.");
  }
  if (notes_say.length > DISCOVERY_LIMITS.discrepancy) {
    throw new Error("Notes are too long.");
  }
  if (resolution_note.length > DISCOVERY_LIMITS.discrepancy) {
    throw new Error("Resolution note is too long.");
  }
  if (draft.severity !== "low" && draft.severity !== "medium" && draft.severity !== "high") {
    throw new Error("Severity must be low, medium, or high.");
  }
  if (draft.status !== "open" && draft.status !== "resolved") {
    throw new Error("Status must be open or resolved.");
  }
  return {
    space_id: draft.space_id,
    plan_shows,
    notes_say,
    severity: draft.severity,
    status: draft.status,
    resolution_note,
  };
}

export type SpaceGroup<T> = {
  name: string;
  label: string;
  spaces: T[];
};

export function groupSpaces<
  T extends { group_name: string; sort_order: number; name: string },
>(spaces: readonly T[]): SpaceGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const space of spaces) {
    const name = space.group_name.trim();
    const list = buckets.get(name);
    if (list) list.push(space);
    else buckets.set(name, [space]);
  }
  const groups = [...buckets.entries()].map(([name, list]) => {
    const sorted = [...list].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    return {
      name,
      label: name || "Ungrouped",
      spaces: sorted,
      min: sorted[0]?.sort_order ?? 0,
    };
  });
  groups.sort((a, b) => a.min - b.min || a.label.localeCompare(b.label));
  return groups.map(({ name, label, spaces: grouped }) => ({
    name,
    label,
    spaces: grouped,
  }));
}

export function flattenSpaces<
  T extends { group_name: string; sort_order: number; name: string },
>(spaces: readonly T[]): T[] {
  return groupSpaces(spaces).flatMap((group) => group.spaces);
}

export function moveSpace<
  T extends { id: string; group_name: string; sort_order: number; name: string },
>(spaces: readonly T[], id: string, direction: -1 | 1): T[] | null {
  const groups = groupSpaces(spaces);
  const group = groups.find((item) => item.spaces.some((space) => space.id === id));
  if (!group) return null;
  const index = group.spaces.findIndex((space) => space.id === id);
  const target = index + direction;
  if (target < 0 || target >= group.spaces.length) return null;
  const next = group.spaces.slice();
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row);
  return groups.flatMap((item) => (item === group ? next : item.spaces));
}

export function placeSpaceInGroup<
  T extends { id: string; group_name: string; sort_order: number; name: string },
>(spaces: readonly T[], id: string, groupName: string): T[] {
  const current = spaces.find((space) => space.id === id);
  if (!current) return [...spaces];
  const updated = { ...current, group_name: groupName.trim() };
  const rest = spaces.filter((space) => space.id !== id);
  const groups = groupSpaces(rest);
  const name = groupName.trim();
  let placed = false;
  const next = groups.map((group) => {
    if (group.name !== name) return group;
    placed = true;
    return { ...group, spaces: [...group.spaces, updated] };
  });
  if (!placed) next.push({ name, label: name || "Ungrouped", spaces: [updated] });
  return next.flatMap((group) => group.spaces);
}

export function visibleDiscoveryQuestions<
  T extends KickoffQuestion,
>(
  questions: readonly T[],
  systems: readonly { key: string; applies_to: SystemAppliesTo }[],
  inScope: ReadonlySet<string>,
): T[] {
  const spaceScope = new Set(
    systems
      .filter((system) => inScope.has(system.key) && systemAppliesToSpace(system.applies_to))
      .map((system) => system.key),
  );
  return questions
    .filter((question) => questionIsVisible(question, spaceScope))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function discoveryContentType(
  kind: DiscoveryAttachmentKind,
  file: { type: string; name: string },
): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null {
  const type = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (kind === "floor_plan") {
    if (type === "application/pdf" || ext === "pdf") return "application/pdf";
    return null;
  }
  if (type === "image/jpeg" || type === "image/jpg" || ext === "jpg" || ext === "jpeg") {
    return "image/jpeg";
  }
  if (type === "image/png" || ext === "png") return "image/png";
  if (type === "image/webp" || ext === "webp") return "image/webp";
  return null;
}

export function discoveryExtension(
  contentType: string,
): "pdf" | "jpg" | "png" | "webp" | null {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return null;
}

export function discoveryStoragePath(projectId: string, id: string, extension: string): string {
  if (!UUID_RE.test(projectId) || !UUID_RE.test(id)) {
    throw new Error("Could not build a storage path for this file.");
  }
  return `projects/${projectId.toLowerCase()}/${id.toLowerCase()}.${extension}`;
}

export function assertDiscoveryFile(
  kind: DiscoveryAttachmentKind,
  file: { type: string; name: string; size: number },
): { contentType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"; fileName: string } {
  const contentType = discoveryContentType(kind, file);
  if (!contentType) {
    throw new Error(
      kind === "floor_plan"
        ? "Floor plans are PDF files."
        : "Renderings are JPEG, PNG, or WebP images.",
    );
  }
  if (file.size <= 0) throw new Error("That file is empty.");
  if (file.size > DISCOVERY_FILE_BYTE_LIMIT) {
    throw new Error("Files must be 20 MB or smaller.");
  }
  const fileName = file.name.trim().slice(0, DISCOVERY_LIMITS.fileName) || (
    kind === "floor_plan" ? "floor-plan.pdf" : "rendering"
  );
  return { contentType, fileName };
}

export const SEVERITY_LABEL: Record<DiscoverySeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
