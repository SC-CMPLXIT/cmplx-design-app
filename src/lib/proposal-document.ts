import { formatDate } from "./dates";
import { TECHNOLOGY_SYSTEMS } from "./systems";
import {
  centsToDollarInput,
  designFee,
  formatHours,
  formatPercent,
  formatUsd,
  lineExtendedCents,
  milestoneAmounts,
  splitIsValid,
  type DesignAssumptions,
  type DesignFee,
  type MilestoneSplit,
} from "./proposal-fee";
import {
  AGREEMENT_PARAGRAPHS,
  CLAUSE_BLOCKS,
  SCOPE_BLOCKS,
  scopeKeysForKind,
} from "./proposal-library";
import type { Project, ProjectProposal, ProposalKind, ProposalLine } from "./types";

export const PHASE_LABEL: Record<ProposalLine["phase"], string> = {
  procurement: "Procurement",
  installation: "Installation",
  commissioning: "Commissioning",
};

export type DocumentLine = {
  id: string;
  systemKey: string;
  systemName: string;
  spaceLabel: string;
  phaseLabel: string;
  name: string;
  quantityLabel: string;
  unitMsrpLabel: string;
  extendedLabel: string;
  extendedCents: number | null;
  notes: string;
};

export type NamedBlock = {
  key: string;
  title: string;
  body: string;
};

export type ProposalDocument = {
  kind: ProposalKind;
  kindLabel: string;
  title: string;
  subtitle: string;
  projectName: string;
  clientName: string;
  issuedLabel: string;
  statement: string;
  scopeBlocks: NamedBlock[];
  scopeNote: string;
  feeNote: string;
  design: DesignFee | null;
  assumptions: DesignAssumptions | null;
  lines: DocumentLine[];
  hardwareCents: number;
  unpricedCount: number;
  laborCents: number;
  hardwareSplit: MilestoneSplit;
  laborSplit: MilestoneSplit;
  hardwareAmounts: ReturnType<typeof milestoneAmounts>;
  laborAmounts: ReturnType<typeof milestoneAmounts>;
  agreement: readonly string[];
  agreementNote: string;
  assumptionBlocks: NamedBlock[];
  exclusionBlocks: NamedBlock[];
  fixedTerms: string[];
  termBlocks: NamedBlock[];
};

export function assumptionsFrom(proposal: ProjectProposal): DesignAssumptions {
  return {
    designRateCents: proposal.design_rate_cents,
    draftingRateCents: proposal.drafting_rate_cents,
    caDayRateCents: proposal.ca_day_rate_cents,
    bodDesignHoursPer1000: proposal.bod_design_hours_per_1000,
    bodDraftingHoursPer1000: proposal.bod_drafting_hours_per_1000,
    ddDesignHoursPer1000: proposal.dd_design_hours_per_1000,
    ddDraftingHoursPer1000: proposal.dd_drafting_hours_per_1000,
    caDesignHoursPer1000: proposal.ca_design_hours_per_1000,
    caDraftingHoursPer1000: proposal.ca_drafting_hours_per_1000,
    caSiteDays: proposal.ca_site_days,
  };
}

export function hardwareSplit(proposal: ProjectProposal): MilestoneSplit {
  return {
    depositPct: proposal.hardware_deposit_pct,
    deliveryPct: proposal.hardware_delivery_pct,
    substantialPct: proposal.hardware_substantial_pct,
  };
}

export function laborSplit(proposal: ProjectProposal): MilestoneSplit {
  return {
    depositPct: proposal.labor_deposit_pct,
    deliveryPct: proposal.labor_delivery_pct,
    substantialPct: proposal.labor_substantial_pct,
  };
}

function selectedBlocks(
  keys: string[],
  source: ReadonlyArray<{ key: string; title: string; body: string }>,
): NamedBlock[] {
  const wanted = new Set(keys);
  return source.filter((block) => wanted.has(block.key)).map((block) => ({
    key: block.key,
    title: block.title,
    body: block.body,
  }));
}

function systemName(key: string): string {
  if (!key) return "Unassigned";
  return TECHNOLOGY_SYSTEMS.find((system) => system.key === key)?.name ?? key;
}

export function documentLines(lines: ProposalLine[]): DocumentLine[] {
  return [...lines]
    .filter((line) => !line.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((line) => {
      const extended = lineExtendedCents(line.quantity, line.unit_msrp_cents);
      return {
        id: line.id,
        systemKey: line.system_key,
        systemName: systemName(line.system_key),
        spaceLabel: line.space_label.trim() || "Project-wide",
        phaseLabel: PHASE_LABEL[line.phase],
        name: line.name,
        quantityLabel: `${formatHours(line.quantity)} ${line.unit}`.trim(),
        unitMsrpLabel: line.unit_msrp_cents == null ? "Not set" : formatUsd(line.unit_msrp_cents),
        extendedLabel: extended == null ? "—" : formatUsd(extended),
        extendedCents: extended,
        notes: line.notes,
      };
    });
}

export function hardwareTotalCents(lines: ProposalLine[]): { total: number; unpriced: number } {
  let total = 0;
  let unpriced = 0;
  for (const line of lines) {
    if (line.deleted_at) continue;
    const extended = lineExtendedCents(line.quantity, line.unit_msrp_cents);
    if (extended == null) unpriced += 1;
    else total += extended;
  }
  return { total, unpriced };
}

function designTerms(fee: DesignFee): string[] {
  const total =
    fee.totalCents == null
      ? "the sum of the phase lines once gross area is set"
      : formatUsd(fee.totalCents);
  return [
    `Consulting invoices are due net 30 from the invoice date. The design fee on this proposal is ${total}. The client pays by check, ACH, or wire to the account on the invoice.`,
    "Invoices not paid within 30 days of the due date bear interest at 1.5% per month, or the maximum rate permitted by applicable law, whichever is less, compounding monthly from the due date until paid in full.",
    "Reimbursable expenses, including travel, lodging, meals, shipping, expediting fees, permit fees, and rental equipment, are invoiced at cost plus 10%. An expense over $500 needs the client's written approval first.",
  ];
}

function implementationTerms(
  hardwareCents: number,
  laborCents: number,
  hardware: MilestoneSplit,
  labor: MilestoneSplit,
): string[] {
  const hardwareAmounts = milestoneAmounts(hardwareCents, hardware);
  const laborAmounts = milestoneAmounts(laborCents, labor);
  return [
    "Hardware and labor are invoiced on separate milestones. Each column of percents adds to 100. Hardware and labor invoices are due on receipt. A consulting invoice, if one is issued under this proposal, is net 30.",
    `Hardware ordering deposit: ${formatPercent(hardware.depositPct)}% (${formatUsd(hardwareAmounts.depositCents)}), due when the proposal is accepted and before equipment is ordered.`,
    `Hardware delivery: ${formatPercent(hardware.deliveryPct)}% (${formatUsd(hardwareAmounts.deliveryCents)}).`,
    `Hardware substantial completion: ${formatPercent(hardware.substantialPct)}% (${formatUsd(hardwareAmounts.substantialCents)}). This amount is the remainder after the other hardware milestones, so the three hardware amounts equal the hardware total.`,
    `Labor at ordering: ${formatPercent(labor.depositPct)}% (${formatUsd(laborAmounts.depositCents)}).`,
    `Labor at delivery: ${formatPercent(labor.deliveryPct)}% (${formatUsd(laborAmounts.deliveryCents)}).`,
    `Labor at substantial completion: ${formatPercent(labor.substantialPct)}% (${formatUsd(laborAmounts.substantialCents)}). This amount is the remainder after the other labor milestones, so the three labor amounts equal the labor total.`,
    "Invoices not paid within 30 days of the due date bear interest at 1.5% per month, or the maximum rate permitted by applicable law, whichever is less, compounding monthly from the due date until paid in full.",
    "Reimbursable expenses, including travel, lodging, meals, shipping, expediting fees, permit fees, and rental equipment, are invoiced at cost plus 10%. An expense over $500 needs the client's written approval first.",
  ];
}

export function buildProposalDocument(
  project: Project,
  proposal: ProjectProposal,
  lines: ProposalLine[],
): ProposalDocument {
  const kindLabel =
    proposal.kind === "design"
      ? "Technology consulting and design services"
      : "Technology implementation services";
  const designAssumptions = assumptionsFrom(proposal);
  const fee = proposal.kind === "design" ? designFee(project.area_sf ?? null, designAssumptions) : null;
  const priced = hardwareTotalCents(lines);
  const hardware = hardwareSplit(proposal);
  const labor = laborSplit(proposal);
  const scopeKeys = scopeKeysForKind(proposal.kind, proposal.scope_keys);
  return {
    kind: proposal.kind,
    kindLabel,
    title: proposal.title.trim() || project.name,
    subtitle: proposal.subtitle.trim() || kindLabel,
    projectName: project.name,
    clientName: proposal.client_name.trim(),
    issuedLabel: formatDate(proposal.issued_on),
    statement: proposal.project_statement.trim(),
    scopeBlocks: selectedBlocks(scopeKeys, SCOPE_BLOCKS),
    scopeNote: proposal.scope_note.trim(),
    feeNote:
      "Significant changes in the project's design, scope, or schedule may require additional services.",
    design: fee,
    assumptions: proposal.kind === "design" ? designAssumptions : null,
    lines: proposal.kind === "implementation" ? documentLines(lines) : [],
    hardwareCents: priced.total,
    unpricedCount: priced.unpriced,
    laborCents: proposal.labor_cents,
    hardwareSplit: hardware,
    laborSplit: labor,
    hardwareAmounts: milestoneAmounts(priced.total, hardware),
    laborAmounts: milestoneAmounts(proposal.labor_cents, labor),
    agreement: AGREEMENT_PARAGRAPHS,
    agreementNote: proposal.agreement_note.trim(),
    assumptionBlocks: selectedBlocks(proposal.assumption_keys, CLAUSE_BLOCKS),
    exclusionBlocks: selectedBlocks(proposal.exclusion_keys, CLAUSE_BLOCKS),
    fixedTerms:
      proposal.kind === "design" && fee
        ? designTerms(fee)
        : implementationTerms(priced.total, proposal.labor_cents, hardware, labor),
    termBlocks: selectedBlocks(proposal.term_keys, CLAUSE_BLOCKS),
  };
}

export function proposalIssues(proposal: ProjectProposal): string[] {
  const issues: string[] = [];
  if (!splitIsValid(hardwareSplit(proposal))) {
    issues.push("Hardware milestones must add to 100%.");
  }
  if (!splitIsValid(laborSplit(proposal))) {
    issues.push("Labor milestones must add to 100%.");
  }
  const rates = [
    proposal.design_rate_cents,
    proposal.drafting_rate_cents,
    proposal.ca_day_rate_cents,
    proposal.labor_cents,
  ];
  if (rates.some((value) => !Number.isFinite(value) || value < 0)) {
    issues.push("Rates and the labor amount cannot be negative.");
  }
  const hours = [
    proposal.bod_design_hours_per_1000,
    proposal.bod_drafting_hours_per_1000,
    proposal.dd_design_hours_per_1000,
    proposal.dd_drafting_hours_per_1000,
    proposal.ca_design_hours_per_1000,
    proposal.ca_drafting_hours_per_1000,
    proposal.ca_site_days,
  ];
  if (hours.some((value) => !Number.isFinite(value) || value < 0)) {
    issues.push("Hours and site days cannot be negative.");
  }
  return issues;
}

export function designMathCaption(fee: DesignFee, assumptions: DesignAssumptions): string {
  const rates = `Design ${formatUsd(assumptions.designRateCents)} per hour, drafting ${formatUsd(assumptions.draftingRateCents)} per hour, construction-administration site day ${formatUsd(assumptions.caDayRateCents)}.`;
  if (fee.areaUnits == null) {
    return `${rates} Set gross area to turn hours per 1,000 sf into hours. Site days are a count for the project, not per 1,000 sf.`;
  }
  return `${rates} Hours = ${formatHours(fee.areaSf)} sf ÷ 1,000 × the hours per 1,000 sf for that phase (${formatHours(fee.areaUnits)} × the rate shown). Site days are a count, not per 1,000 sf. Dollars round to the cent after that multiplication.`;
}

export function msrpInput(cents: number | null): string {
  return centsToDollarInput(cents);
}
