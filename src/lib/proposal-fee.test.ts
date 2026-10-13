import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CA_DAY_RATE_CENTS,
  DEFAULT_CA_SITE_DAYS,
  DEFAULT_DESIGN_ASSUMPTIONS,
  DESIGN_RATE_CENTS,
  DRAFTING_RATE_CENTS,
  commitNonNegativeDecimal,
  designFee,
  formatHours,
  formatUsd,
  parseNonNegativeDecimal,
} from "./proposal-fee.ts";

function sum(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

describe("design fee defaults at 11,500 sf", () => {
  const fee = designFee(11_500, DEFAULT_DESIGN_ASSUMPTIONS);
  const designHours = sum(fee.phases.map((phase) => phase.designHours));
  const draftingHours = sum(fee.phases.map((phase) => phase.draftingHours));
  const designCents = sum(fee.phases.map((phase) => phase.designCents));
  const draftingCents = sum(fee.phases.map((phase) => phase.draftingCents));
  const siteCents = fee.phases.find((phase) => phase.key === "ca")?.siteCents ?? null;

  it("keeps the published rates and four site days", () => {
    assert.equal(DESIGN_RATE_CENTS, 20_000);
    assert.equal(DRAFTING_RATE_CENTS, 11_000);
    assert.equal(CA_DAY_RATE_CENTS, 120_000);
    assert.equal(DEFAULT_CA_SITE_DAYS, 4);
    assert.equal(DEFAULT_DESIGN_ASSUMPTIONS.caSiteDays, 4);
  });

  it("totals $32,457.50", () => {
    assert.equal(formatHours(designHours), "103.5");
    assert.equal(formatHours(draftingHours), "63.25");
    assert.equal(designCents, 2_070_000);
    assert.equal(draftingCents, 695_750);
    assert.equal(siteCents, 480_000);
    assert.equal(fee.totalCents, 3_245_750);
    assert.equal(formatUsd(designCents), "$20,700.00");
    assert.equal(formatUsd(draftingCents), "$6,957.50");
    assert.equal(formatUsd(siteCents), "$4,800.00");
    assert.equal(formatUsd(fee.totalCents), "$32,457.50");
  });

  it("totals $48,090 at 18,000 sf", () => {
    const clubhouse = designFee(18_000, DEFAULT_DESIGN_ASSUMPTIONS);
    assert.equal(formatUsd(clubhouse.totalCents), "$48,090.00");
  });
});

describe("decimal hour inputs", () => {
  it("keeps 0.5 and other two-decimal values", () => {
    assert.equal(parseNonNegativeDecimal("0.5"), 0.5);
    assert.equal(parseNonNegativeDecimal("0.50"), 0.5);
    assert.equal(parseNonNegativeDecimal(".5"), 0.5);
    assert.equal(commitNonNegativeDecimal("0."), 0);
    assert.equal(commitNonNegativeDecimal("4."), 4);
    assert.equal(parseNonNegativeDecimal("0."), null);
    assert.equal(parseNonNegativeDecimal("5.125"), null);
  });
});
