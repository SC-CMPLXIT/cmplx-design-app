// IT-load UPS sizing. Session math only — nothing here is stored on a project.
// Apparent power VA = watts ÷ power factor.
// Recommended VA = apparent power × safety margin, then the smallest common tier at or above that.
// Runtime minutes = (battery Wh × efficiency% ÷ 100) ÷ load W × 60.
// Keep the IT load at or under about 80% of the chosen tier.

export const UPS_PRESETS = [
  { key: "server_1u", label: "1U Rack Server", watts: 200 },
  { key: "server_2u", label: "2U Rack Server", watts: 350 },
  { key: "server_4u", label: "4U Server (GPU/Storage)", watts: 700 },
  { key: "switch_24", label: "24-Port Switch", watts: 50 },
  { key: "switch_poe", label: "24-Port PoE Switch", watts: 200 },
  { key: "firewall", label: "Firewall / Router", watts: 60 },
  { key: "nas", label: "NAS / Storage Array", watts: 150 },
  { key: "ap", label: "Wireless AP", watts: 15 },
  { key: "workstation", label: "Workstation", watts: 200 },
  { key: "custom", label: "Custom Device", watts: 0 },
] as const;

export type UpsPresetKey = (typeof UPS_PRESETS)[number]["key"];

export const POWER_FACTORS = [
  { value: 0.9, label: "0.9 — Typical IT" },
  { value: 1, label: "1.0 — Resistive" },
  { value: 0.8, label: "0.8 — Conservative" },
] as const;

export const SAFETY_MARGINS = [
  { value: 1.2, label: "20% (standard)" },
  { value: 1.25, label: "25% (recommended)" },
  { value: 1.3, label: "30% (high availability)" },
] as const;

/** Common single-phase UPS ratings, smallest to largest. */
export const UPS_VA_TIERS = [750, 1000, 1500, 2000, 3000, 5000, 6000, 10000, 15000] as const;

/** Rule of thumb: do not run a UPS above this share of its VA rating. */
export const UPS_LOAD_CEILING_PCT = 80;

/** Warn once load passes 70%, while it is still at or under the ceiling. */
export const UPS_LOAD_WARN_PCT = 70;

export const DEFAULT_UPS_DEVICES = [
  { id: "d1", type: "server_1u" as const, label: "1U Rack Server", watts: 200, qty: 2 },
  { id: "d2", type: "switch_24" as const, label: "24-Port Switch", watts: 50, qty: 1 },
  { id: "d3", type: "firewall" as const, label: "Firewall / Router", watts: 60, qty: 1 },
];

export const DEFAULT_UPS_CONFIG = {
  powerFactor: 0.9,
  margin: 1.25,
  efficiencyPct: 94,
  batteryWh: 2400,
} as const;

export type UpsMode = "battery" | "runtime";

export type UpsTone = "idle" | "pass" | "warn" | "fail";

export type UpsSizing = {
  totalW: number;
  apparentVa: number;
  recommendedVa: number;
  tierVa: number;
  tierInCatalog: boolean;
  loadPct: number;
  /** Minutes for the active mode. Null when load or efficiency cannot produce one. */
  runtimeMin: number | null;
  /** Watt-hours for the active mode. Null when load or efficiency cannot produce one. */
  batteryWh: number | null;
  status: { tone: UpsTone; label: string };
};

export function upsPreset(key: string) {
  return UPS_PRESETS.find((preset) => preset.key === key);
}

export function parseUpsNumber(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function runtimeMinutes(batteryWh: number, efficiencyPct: number, totalW: number): number | null {
  if (totalW <= 0 || efficiencyPct <= 0) return null;
  return ((batteryWh * (efficiencyPct / 100)) / totalW) * 60;
}

export function requiredBatteryWh(minutes: number, efficiencyPct: number, totalW: number): number | null {
  if (totalW <= 0 || efficiencyPct <= 0) return null;
  return (minutes * totalW * 100) / (60 * efficiencyPct);
}

/** Smallest catalog tier at or above `recommendedVa`. Above 15,000 VA, the next 1,000 VA. */
export function upsTier(recommendedVa: number): { va: number; inCatalog: boolean } {
  const tier = UPS_VA_TIERS.find((size) => size >= recommendedVa);
  if (tier !== undefined) return { va: tier, inCatalog: true };
  return { va: Math.ceil(recommendedVa / 1000) * 1000, inCatalog: false };
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function sizeUps(input: {
  devices: Array<{ watts: number; qty: number }>;
  powerFactor: number;
  margin: number;
  efficiencyPct: number;
  mode: UpsMode;
  batteryWh: number;
  targetMinutes: number;
}): UpsSizing {
  const totalW = input.devices.reduce(
    (sum, device) => sum + nonNegative(device.watts) * nonNegative(device.qty),
    0,
  );
  const powerFactor = input.powerFactor > 0 ? input.powerFactor : 0;
  const margin = input.margin > 0 ? input.margin : 1;
  const efficiencyPct = nonNegative(input.efficiencyPct);
  const apparentVa = powerFactor > 0 ? totalW / powerFactor : 0;
  const recommendedVa = apparentVa * margin;
  const tier = upsTier(recommendedVa);
  const loadPct = totalW > 0 && tier.va > 0 ? Math.round((apparentVa / tier.va) * 100) : 0;

  const batteryWh = nonNegative(input.batteryWh);
  const targetMinutes = nonNegative(input.targetMinutes);
  const runtimeMin =
    input.mode === "battery"
      ? runtimeMinutes(batteryWh, efficiencyPct, totalW)
      : totalW > 0
        ? targetMinutes
        : null;
  const sizedBatteryWh =
    input.mode === "runtime"
      ? requiredBatteryWh(targetMinutes, efficiencyPct, totalW)
      : totalW > 0
        ? batteryWh
        : null;

  return {
    totalW,
    apparentVa,
    recommendedVa,
    tierVa: tier.va,
    tierInCatalog: tier.inCatalog,
    loadPct,
    runtimeMin,
    batteryWh: sizedBatteryWh,
    status: upsStatus(totalW, loadPct),
  };
}

export function upsStatus(totalW: number, loadPct: number): UpsSizing["status"] {
  if (totalW <= 0) return { tone: "idle", label: "Add IT load" };
  if (loadPct > UPS_LOAD_CEILING_PCT) {
    return { tone: "fail", label: `Load at ${loadPct}% · above the 80% ceiling` };
  }
  if (loadPct > UPS_LOAD_WARN_PCT) {
    return { tone: "warn", label: `Load at ${loadPct}% · nearing the 80% ceiling` };
  }
  return { tone: "pass", label: `Load at ${loadPct}% · under the 80% ceiling` };
}

export function formatWatts(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} W`;
}

export function formatVa(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} VA`;
}

export function formatWh(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} Wh`;
}

export function formatMinutes(value: number): string {
  return `${value.toFixed(1)} min`;
}
