import { TECHNOLOGY_CATEGORIES } from "./categories";
import { TECHNOLOGY_SYSTEMS } from "./systems";
import type {
  DiscoveryAnswer,
  DiscoverySpace,
  KickoffQuestion,
  ProjectSystemScope,
  ScopeItem,
  TechnologySystem,
} from "./types";

export type NarrativeTarget = {
  categoryKey: string | null;
  label: string;
};

export type LockedSuggestion = {
  answerId: string;
  discoverySpaceId: string;
  discoverySpaceName: string;
  narrativeSpaceId: string | null;
  systemKey: string;
  systemName: string;
  questionKey: string;
  prompt: string;
  body: string;
  /** First in-scope category for the system, otherwise the overview. */
  target: NarrativeTarget;
  targets: NarrativeTarget[];
};

const OVERVIEW: NarrativeTarget = { categoryKey: null, label: "Overview" };

export function suggestionBlock(systemName: string, prompt: string, body: string): string {
  return `${systemName}\n${prompt.trim()}\n${body.trim()}`;
}

/**
 * Fill an empty note. Append when the note already has text.
 * Throws when the same block is already in the note, so a second click cannot stack it.
 */
export function applySuggestion(
  current: string,
  block: string,
): { text: string; action: "fill" | "append" } {
  const next = block.trim();
  if (!next) throw new Error("Nothing to insert.");
  if (current.includes(next)) {
    throw new Error("That locked answer is already in this note.");
  }
  if (!current.trim()) return { text: next, action: "fill" };
  return { text: `${current.replace(/\s+$/, "")}\n\n${next}`, action: "append" };
}

export function suggestionAlreadyIn(current: string, block: string): boolean {
  const next = block.trim();
  return next.length > 0 && current.includes(next);
}

function categoryName(key: string, scopeItems: ScopeItem[]): string {
  return (
    scopeItems.find((item) => item.category_key === key)?.category_name ??
    TECHNOLOGY_CATEGORIES.find((item) => item.key === key)?.name ??
    key
  );
}

function targetsForSystem(system: TechnologySystem, scopeItems: ScopeItem[]): NarrativeTarget[] {
  const inScope = new Set(
    scopeItems.filter((item) => item.in_scope).map((item) => item.category_key),
  );
  const linked = system.category_keys.map((key) => ({
    categoryKey: key,
    label: categoryName(key, scopeItems),
  }));
  const preferred = linked.filter((target) => inScope.has(target.categoryKey ?? ""));
  const otherInScope = scopeItems
    .filter((item) => item.in_scope && !linked.some((target) => target.categoryKey === item.category_key))
    .map((item) => ({ categoryKey: item.category_key, label: item.category_name }));
  const seen = new Set<string>();
  const ordered = [...preferred, ...otherInScope, OVERVIEW, ...linked];
  return ordered.filter((target) => {
    const id = target.categoryKey ?? "__overview__";
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function defaultTarget(targets: NarrativeTarget[], scopeItems: ScopeItem[]): NarrativeTarget {
  const inScope = new Set(
    scopeItems.filter((item) => item.in_scope).map((item) => item.category_key),
  );
  return (
    targets.find((target) => target.categoryKey && inScope.has(target.categoryKey)) ?? OVERVIEW
  );
}

export function lockedSuggestions(input: {
  spaces: DiscoverySpace[];
  answers: DiscoveryAnswer[];
  questions: KickoffQuestion[];
  systems: TechnologySystem[];
  scope: ProjectSystemScope[];
  scopeItems: ScopeItem[];
}): LockedSuggestion[] {
  const inScope = new Set(input.scope.filter((row) => row.in_scope).map((row) => row.system_key));
  const systems = (
    input.systems.length > 0 ? input.systems : TECHNOLOGY_SYSTEMS.map((system) => ({ ...system, category_keys: [...system.category_keys] }))
  ).slice();
  const questions = new Map(input.questions.map((question) => [question.key, question]));
  const rooms = new Map(
    input.spaces.filter((space) => !space.deleted_at).map((space) => [space.id, space]),
  );
  const suggestions: LockedSuggestion[] = [];

  for (const answer of input.answers) {
    if (answer.status !== "locked" || !answer.body.trim()) continue;
    const room = rooms.get(answer.space_id);
    if (!room) continue;
    const question = questions.get(answer.question_key);
    if (!question) continue;
    const visible = question.system_keys.some((key) => inScope.has(key));
    if (!visible) continue;
    for (const systemKey of question.system_keys) {
      if (!inScope.has(systemKey)) continue;
      const system = systems.find((item) => item.key === systemKey);
      if (!system) continue;
      const targets = targetsForSystem(system, input.scopeItems);
      suggestions.push({
        answerId: answer.id,
        discoverySpaceId: room.id,
        discoverySpaceName: room.name,
        narrativeSpaceId: room.narrative_space_id,
        systemKey: system.key,
        systemName: system.name,
        questionKey: question.key,
        prompt: question.prompt,
        body: answer.body.trim(),
        target: defaultTarget(targets, input.scopeItems),
        targets,
      });
    }
  }

  return suggestions.sort((a, b) => {
    const room = a.discoverySpaceName.localeCompare(b.discoverySpaceName);
    if (room !== 0) return room;
    return a.systemName.localeCompare(b.systemName) || a.prompt.localeCompare(b.prompt);
  });
}

export function systemForCategory(categoryKey: string | null): { key: string; name: string } | null {
  if (!categoryKey) return null;
  const system = TECHNOLOGY_SYSTEMS.find((item) => item.category_keys.includes(categoryKey));
  return system ? { key: system.key, name: system.name } : null;
}

export function bomSuggestionName(spaceName: string, systemName: string): string {
  const name = `${spaceName} — ${systemName}`;
  return name.length <= 200 ? name : name.slice(0, 200);
}
