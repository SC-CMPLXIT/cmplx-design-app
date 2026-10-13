/**
 * Design fee and implementation milestone math.
 *
 * Every dollar uses a number the editor can see. There is no contingency,
 * efficiency factor, or other multiplier.
 *
 * Design hours for a phase = (area_sf / 1,000) × hours per 1,000 sf.
 * Design fee = those hours × the design rate.
 * Drafting fee = drafting hours × the drafting rate.
 * CA site fee = site-day count × the site-day rate. The count is not per square foot.
 * A line's dollars round to the cent after that multiplication.
 *
 * Starting assumptions (change them on the draft):
 *   Basis of Design: 3 design hours and 1 drafting hour per 1,000 sf
 *   DD–CD: 5 design hours and 4 drafting hours per 1,000 sf
 *   CA: 1 design hour and 0.5 drafting hour per 1,000 sf, plus 4 site days
 *   (11,500 sf: 103.5 design h, 63.25 drafting h, 4 site days = $32,457.50)
 *   Rates: $200 / design hour, $110 / drafting hour, $1,200 / CA site day
 *
 * Hardware milestones default to 90% ordering deposit, 8% delivery, 2%
 * substantial completion. 8 and 2 are the attached proposal's 40:10 remainder
 * scaled so the three percents add to 100 when the deposit is 90.
 * Labor defaults to 0% at ordering, 75% at delivery, 25% at substantial
 * completion, matching that proposal's labor split. The last milestone in
 * each column is the remainder so the amounts add up to the column total.
 */

export const DESIGN_RATE_CENTS = 20_000;
export const DRAFTING_RATE_CENTS = 11_000;
export const CA_DAY_RATE_CENTS = 120_000;

export const DEFAULT_BOD_DESIGN_HOURS = 3;
export const DEFAULT_BOD_DRAFTING_HOURS = 1;
export const DEFAULT_DD_DESIGN_HOURS = 5;
export const DEFAULT_DD_DRAFTING_HOURS = 4;
export const DEFAULT_CA_DESIGN_HOURS = 1;
export const DEFAULT_CA_DRAFTING_HOURS = 0.5;
export const DEFAULT_CA_SITE_DAYS = 4;

export const DEFAULT_HARDWARE_DEPOSIT_PCT = 90;
export const DEFAULT_HARDWARE_DELIVERY_PCT = 8;
export const DEFAULT_HARDWARE_SUBSTANTIAL_PCT = 2;
export const DEFAULT_LABOR_DEPOSIT_PCT = 0;
export const DEFAULT_LABOR_DELIVERY_PCT = 75;
export const DEFAULT_LABOR_SUBSTANTIAL_PCT = 25;

export const DESIGN_PHASES = [
  { key: "bod", label: "Basis of Design" },
  { key: "dd_cd", label: "DD–CD" },
  { key: "ca", label: "Construction administration" },
] as const;

export type DesignPhaseKey = (typeof DESIGN_PHASES)[number]["key"];

export type DesignAssumptions = {
  designRateCents: number;
  draftingRateCents: number;
  caDayRateCents: number;
  bodDesignHoursPer1000: number;
  bodDraftingHoursPer1000: number;
  ddDesignHoursPer1000: number;
  ddDraftingHoursPer1000: number;
  caDesignHoursPer1000: number;
  caDraftingHoursPer1000: number;
  caSiteDays: number;
};

export const DEFAULT_DESIGN_ASSUMPTIONS: DesignAssumptions = {
  designRateCents: DESIGN_RATE_CENTS,
  draftingRateCents: DRAFTING_RATE_CENTS,
  caDayRateCents: CA_DAY_RATE_CENTS,
  bodDesignHoursPer1000: DEFAULT_BOD_DESIGN_HOURS,
  bodDraftingHoursPer1000: DEFAULT_BOD_DRAFTING_HOURS,
  ddDesignHoursPer1000: DEFAULT_DD_DESIGN_HOURS,
  ddDraftingHoursPer1000: DEFAULT_DD_DRAFTING_HOURS,
  caDesignHoursPer1000: DEFAULT_CA_DESIGN_HOURS,
  caDraftingHoursPer1000: DEFAULT_CA_DRAFTING_HOURS,
  caSiteDays: DEFAULT_CA_SITE_DAYS,
};

export type PhaseFeeLine = {
  key: DesignPhaseKey;
  label: string;
  designHoursPer1000: number;
  draftingHoursPer1000: number;
  designHours: number | null;
  draftingHours: number | null;
  designCents: number | null;
  draftingCents: number | null;
  siteDays: number | null;
  siteCents: number | null;
  totalCents: number | null;
};

export type DesignFee = {
  areaSf: number | null;
  /** area_sf / 1,000. Null until area is set. */
  areaUnits: number | null;
  phases: PhaseFeeLine[];
  totalCents: number | null;
};

export type MilestoneSplit = {
  depositPct: number;
  deliveryPct: number;
  substantialPct: number;
};

export type MilestoneAmounts = {
  depositCents: number;
  deliveryCents: number;
  substantialCents: number;
};

export function formatUsd(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(hours);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Whole square feet, or null when the field is empty. */
export function parseAreaSf(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Gross area is a whole number of square feet.");
  }
  const area = Number(trimmed);
  if (!Number.isSafeInteger(area) || area <= 0) {
    throw new Error("Gross area must be greater than zero.");
  }
  return area;
}

export function dollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    throw new Error("Enter a dollar amount with up to two decimal places.");
  }
  const cents = Math.round(Number(trimmed) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("Enter a dollar amount with up to two decimal places.");
  }
  return cents;
}

export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

/**
 * Hours and site days. Blank is 0. A trailing dot is unfinished, so the
 * result is null and the field can keep the character the editor just typed.
 * Two decimal places match `numeric(8, 2)`.
 */
export function parseNonNegativeDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed === "." || trimmed.endsWith(".")) return null;
  if (!/^(?:\d+\.\d{0,2}|\d+|\.\d{1,2})$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

/** Finish an hours field. A trailing dot keeps the digits before it. */
export function commitNonNegativeDecimal(value: string): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") return 0;
  const normalized = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
  return parseNonNegativeDecimal(normalized) ?? 0;
}

function roundCents(amount: number): number {
  return Math.round(amount);
}

function hoursFor(areaUnits: number, perThousand: number): number {
  return areaUnits * perThousand;
}

function phaseNumbers(
  key: DesignPhaseKey,
  assumptions: DesignAssumptions,
): { designPer: number; draftingPer: number; siteDays: number } {
  if (key === "bod") {
    return {
      designPer: assumptions.bodDesignHoursPer1000,
      draftingPer: assumptions.bodDraftingHoursPer1000,
      siteDays: 0,
    };
  }
  if (key === "dd_cd") {
    return {
      designPer: assumptions.ddDesignHoursPer1000,
      draftingPer: assumptions.ddDraftingHoursPer1000,
      siteDays: 0,
    };
  }
  return {
    designPer: assumptions.caDesignHoursPer1000,
    draftingPer: assumptions.caDraftingHoursPer1000,
    siteDays: assumptions.caSiteDays,
  };
}

export function designFee(areaSf: number | null, assumptions: DesignAssumptions): DesignFee {
  const areaUnits = areaSf != null && areaSf > 0 ? areaSf / 1000 : null;
  const phases: PhaseFeeLine[] = DESIGN_PHASES.map((phase) => {
    const numbers = phaseNumbers(phase.key, assumptions);
    if (areaUnits == null) {
      return {
        key: phase.key,
        label: phase.label,
        designHoursPer1000: numbers.designPer,
        draftingHoursPer1000: numbers.draftingPer,
        designHours: null,
        draftingHours: null,
        designCents: null,
        draftingCents: null,
        siteDays: phase.key === "ca" ? numbers.siteDays : null,
        siteCents: null,
        totalCents: null,
      };
    }
    const designHours = hoursFor(areaUnits, numbers.designPer);
    const draftingHours = hoursFor(areaUnits, numbers.draftingPer);
    const designCents = roundCents(designHours * assumptions.designRateCents);
    const draftingCents = roundCents(draftingHours * assumptions.draftingRateCents);
    const siteDays = phase.key === "ca" ? numbers.siteDays : null;
    const siteCents =
      siteDays == null ? null : roundCents(siteDays * assumptions.caDayRateCents);
    return {
      key: phase.key,
      label: phase.label,
      designHoursPer1000: numbers.designPer,
      draftingHoursPer1000: numbers.draftingPer,
      designHours,
      draftingHours,
      designCents,
      draftingCents,
      siteDays,
      siteCents,
      totalCents: designCents + draftingCents + (siteCents ?? 0),
    };
  });
  const totalCents =
    areaUnits == null ? null : phases.reduce((sum, phase) => sum + (phase.totalCents ?? 0), 0);
  return { areaSf: areaUnits == null ? null : areaSf, areaUnits, phases, totalCents };
}

export function percentTotal(split: MilestoneSplit): number {
  return roundPercent(split.depositPct + split.deliveryPct + split.substantialPct);
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function splitIsValid(split: MilestoneSplit): boolean {
  const values = [split.depositPct, split.deliveryPct, split.substantialPct];
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) return false;
  return percentTotal(split) === 100;
}

/**
 * Deposit and delivery round to the cent. Substantial completion is whatever
 * is left so the three amounts equal `totalCents`.
 */
export function milestoneAmounts(totalCents: number, split: MilestoneSplit): MilestoneAmounts {
  const depositCents = roundCents((totalCents * split.depositPct) / 100);
  const deliveryCents = roundCents((totalCents * split.deliveryPct) / 100);
  return {
    depositCents,
    deliveryCents,
    substantialCents: totalCents - depositCents - deliveryCents,
  };
}

export function lineExtendedCents(quantity: number, unitMsrpCents: number | null): number | null {
  if (unitMsrpCents == null || !Number.isFinite(quantity) || quantity <= 0) return null;
  return roundCents(quantity * unitMsrpCents);
}
