import { todayIsoDate } from "./dates";
import { systemForCategory } from "./discovery-suggestions";
import {
  CA_DAY_RATE_CENTS,
  DEFAULT_BOD_DESIGN_HOURS,
  DEFAULT_BOD_DRAFTING_HOURS,
  DEFAULT_CA_DESIGN_HOURS,
  DEFAULT_CA_DRAFTING_HOURS,
  DEFAULT_CA_SITE_DAYS,
  DEFAULT_DD_DESIGN_HOURS,
  DEFAULT_DD_DRAFTING_HOURS,
  DEFAULT_HARDWARE_DELIVERY_PCT,
  DEFAULT_HARDWARE_DEPOSIT_PCT,
  DEFAULT_HARDWARE_SUBSTANTIAL_PCT,
  DEFAULT_LABOR_DELIVERY_PCT,
  DEFAULT_LABOR_DEPOSIT_PCT,
  DEFAULT_LABOR_SUBSTANTIAL_PCT,
  DESIGN_RATE_CENTS,
  DRAFTING_RATE_CENTS,
} from "./proposal-fee";
import { defaultClauseKeys, suggestedScopeKeys } from "./proposal-library";
import type { BomItem, Project, ProjectProposal, ProposalKind, ProposalLine, ProposalPhase } from "./types";

export function freshProposal(
  project: Project,
  kind: ProposalKind,
  inScopeKeys: readonly string[],
): Omit<ProjectProposal, "id" | "created_at" | "updated_at"> {
  const subtitle =
    kind === "design"
      ? "Technology consulting and design services"
      : "Technology implementation services";
  return {
    project_id: project.id,
    kind,
    title: project.name.slice(0, 200),
    subtitle,
    client_name: "",
    issued_on: todayIsoDate(),
    project_statement: "",
    scope_note: "",
    agreement_note: "",
    design_rate_cents: DESIGN_RATE_CENTS,
    drafting_rate_cents: DRAFTING_RATE_CENTS,
    ca_day_rate_cents: CA_DAY_RATE_CENTS,
    bod_design_hours_per_1000: DEFAULT_BOD_DESIGN_HOURS,
    bod_drafting_hours_per_1000: DEFAULT_BOD_DRAFTING_HOURS,
    dd_design_hours_per_1000: DEFAULT_DD_DESIGN_HOURS,
    dd_drafting_hours_per_1000: DEFAULT_DD_DRAFTING_HOURS,
    ca_design_hours_per_1000: DEFAULT_CA_DESIGN_HOURS,
    ca_drafting_hours_per_1000: DEFAULT_CA_DRAFTING_HOURS,
    ca_site_days: DEFAULT_CA_SITE_DAYS,
    labor_cents: 0,
    hardware_deposit_pct: DEFAULT_HARDWARE_DEPOSIT_PCT,
    hardware_delivery_pct: DEFAULT_HARDWARE_DELIVERY_PCT,
    hardware_substantial_pct: DEFAULT_HARDWARE_SUBSTANTIAL_PCT,
    labor_deposit_pct: DEFAULT_LABOR_DEPOSIT_PCT,
    labor_delivery_pct: DEFAULT_LABOR_DELIVERY_PCT,
    labor_substantial_pct: DEFAULT_LABOR_SUBSTANTIAL_PCT,
    scope_keys: suggestedScopeKeys(kind, new Set(inScopeKeys)),
    assumption_keys: defaultClauseKeys("assumption"),
    exclusion_keys: defaultClauseKeys("exclusion"),
    term_keys: defaultClauseKeys("term"),
  };
}

export function proposalLineFromBom(
  proposalId: string,
  item: BomItem,
  spaceName: string,
  sortOrder: number,
  id = crypto.randomUUID(),
): ProposalLine {
  const now = new Date().toISOString();
  const system = systemForCategory(item.category_key);
  return {
    id,
    proposal_id: proposalId,
    bom_item_id: item.id,
    phase: "installation",
    name: item.name,
    system_key: system?.key ?? "",
    space_label: spaceName,
    quantity: item.quantity,
    unit: item.unit || "ea",
    unit_msrp_cents: null,
    notes: item.notes,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

/**
 * Copy bill-of-materials lines onto the proposal. Existing fee lines keep
 * their MSRP, phase, and notes. Name, quantity, unit, system, and space refresh
 * from the bill of materials. Archived equipment is left as a snapshot.
 */
export function mergeBomIntoLines(
  proposalId: string,
  lines: ProposalLine[],
  bom: BomItem[],
  spaceNames: ReadonlyMap<string, string>,
): ProposalLine[] {
  const live = lines.filter((line) => !line.deleted_at);
  const byBom = new Map(
    live.filter((line) => line.bom_item_id).map((line) => [line.bom_item_id as string, line]),
  );
  let sort = live.reduce((max, line) => Math.max(max, line.sort_order), 0);
  const next = live.map((line) => ({ ...line }));
  for (const item of bom) {
    if (item.deleted_at) continue;
    const spaceName = item.space_id ? (spaceNames.get(item.space_id) ?? "") : "";
    const existing = byBom.get(item.id);
    if (existing) {
      const index = next.findIndex((line) => line.id === existing.id);
      if (index < 0) continue;
      const system = systemForCategory(item.category_key);
      next[index] = {
        ...next[index],
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || "ea",
        system_key: system?.key ?? "",
        space_label: spaceName,
      };
      continue;
    }
    sort += 1;
    next.push(proposalLineFromBom(proposalId, item, spaceName, sort));
  }
  return next;
}

export function blankProposalLine(
  proposalId: string,
  sortOrder: number,
  phase: ProposalPhase = "installation",
): ProposalLine {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    proposal_id: proposalId,
    bom_item_id: null,
    phase,
    name: "",
    system_key: "",
    space_label: "",
    quantity: 1,
    unit: "ea",
    unit_msrp_cents: null,
    notes: "",
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
