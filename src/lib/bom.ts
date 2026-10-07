import { TECHNOLOGY_CATEGORIES } from "./categories";
import type { BomItemDraft } from "./types";

export const BOM_LIMITS = {
  name: 200,
  description: 2000,
  unit: 32,
  manufacturer: 160,
  model: 160,
  sku: 80,
  notes: 2000,
} as const;

export const BOM_UNITS = ["ea", "m", "set", "pair", "lot"] as const;

const CATEGORY_KEYS = new Set<string>(TECHNOLOGY_CATEGORIES.map((category) => category.key));

export function prepareBomName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Each equipment line needs a name.");
  if (trimmed.length > BOM_LIMITS.name) throw new Error("Equipment name is too long.");
  return trimmed;
}

export function prepareBomDraft(draft: BomItemDraft): BomItemDraft {
  const name = prepareBomName(draft.name);
  const quantity = typeof draft.quantity === "number" ? draft.quantity : Number(draft.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`Quantity for “${name}” must be greater than zero.`);
  }
  const rounded = Math.round(quantity * 1000) / 1000;
  if (rounded <= 0 || rounded > 999_999_999.999) {
    throw new Error(`Quantity for “${name}” is too large.`);
  }

  const unit = draft.unit.trim() || "ea";
  if (unit.length > BOM_LIMITS.unit) {
    throw new Error(`Unit for “${name}” is too long.`);
  }

  const categoryKey = draft.category_key?.trim() || null;
  if (categoryKey && !CATEGORY_KEYS.has(categoryKey)) {
    throw new Error(`“${name}” uses an unknown category.`);
  }

  return {
    name,
    description: bounded(draft.description, BOM_LIMITS.description, name, "Description"),
    quantity: rounded,
    unit,
    manufacturer: bounded(draft.manufacturer, BOM_LIMITS.manufacturer, name, "Manufacturer"),
    model: bounded(draft.model, BOM_LIMITS.model, name, "Model"),
    sku: bounded(draft.sku, BOM_LIMITS.sku, name, "SKU"),
    space_id: draft.space_id || null,
    category_key: categoryKey,
    notes: bounded(draft.notes, BOM_LIMITS.notes, name, "Notes"),
  };
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 1000) / 1000);
}

function bounded(value: string, max: number, name: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${label} for “${name}” is too long.`);
  return trimmed;
}
