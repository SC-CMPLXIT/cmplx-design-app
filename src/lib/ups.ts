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

export function upsGuidance(): string {
  const tiers = UPS_VA_TIERS.map((tier) => tier.toLocaleString("en-US")).join(", ");
  return `Size the UPS in VA, not watts. Apparent power is IT watts divided by the power factor (0.9 for typical IT gear, 0.8 when you want a conservative number, 1.0 for a resistive load). Multiply that VA by a 20–30% safety margin — 30% when the rack has to stay up — then pick the smallest common tier that covers it (${tiers} VA). Do not run the load above about 80% of the tier you buy. Runtime in minutes is battery Wh times efficiency divided by 100, divided by load watts, times 60. The other direction solves that same formula for watt-hours.`;
}

function optionLabel(options: readonly { value: number; label: string }[], raw: string): string {
  const match = options.find((option) => String(option.value) === raw);
  return match ? match.label : raw.trim() || "—";
}

/** Plain-text snapshot of the current run. Session only — nothing is stored. */
export function formatUpsSummary(input: {
  devices: Array<{ label: string; watts: string; qty: string }>;
  powerFactor: string;
  margin: string;
  efficiency: string;
  mode: UpsMode;
  batteryWh: string;
  targetMinutes: string;
  sizing: UpsSizing;
  printedOn: string;
}): string {
  const { sizing } = input;
  const runtimeText = sizing.runtimeMin == null ? "—" : formatMinutes(sizing.runtimeMin);
  const batteryText = sizing.batteryWh == null ? "—" : formatWh(sizing.batteryWh);
  const tierText = sizing.totalW > 0 ? formatVa(sizing.tierVa) : "no tier";
  const lines = [
    "CMPLX iT Design — UPS",
    `${formatWatts(sizing.totalW)} · ${tierText} tier · ${sizing.totalW > 0 ? `${sizing.loadPct}% of tier` : "—"} · ${runtimeText} · ${sizing.status.tone.toUpperCase()}`,
    `Printed ${input.printedOn}`,
    "",
    `Status: ${sizing.status.tone.toUpperCase()}`,
    sizing.status.label,
    "",
    `Devices (${input.devices.length})`,
  ];

  if (input.devices.length === 0) {
    lines.push("No devices.");
  } else {
    for (const device of input.devices) {
      const watts = parseUpsNumber(device.watts);
      const qty = parseUpsNumber(device.qty);
      const label = device.label.trim() || "Device";
      lines.push(`${label} — ${formatWatts(watts)} × ${qty} = ${formatWatts(watts * qty)}`);
    }
  }

  lines.push(
    "",
    "Configuration",
    `Power factor: ${optionLabel(POWER_FACTORS, input.powerFactor)}`,
    `Safety margin: ${optionLabel(SAFETY_MARGINS, input.margin)}`,
    `UPS efficiency: ${input.efficiency.trim() || "0"}%`,
    input.mode === "battery"
      ? "Direction: battery watt-hours → runtime"
      : "Direction: target runtime → battery watt-hours",
    input.mode === "battery"
      ? `Battery capacity: ${formatWh(parseUpsNumber(input.batteryWh))}`
      : `Target runtime: ${input.targetMinutes.trim() || "0"} min`,
    "",
    "Sizing",
    `Total IT load: ${formatWatts(sizing.totalW)}`,
    `Apparent power: ${formatVa(sizing.apparentVa)}`,
    `With margin: ${formatVa(sizing.recommendedVa)}`,
    `UPS tier: ${sizing.totalW > 0 ? formatVa(sizing.tierVa) : "—"}${sizing.totalW > 0 && !sizing.tierInCatalog ? " (above catalog)" : ""}`,
    `Load of tier: ${sizing.totalW > 0 ? `${sizing.loadPct}%` : "—"}`,
    `Ceiling: ${UPS_LOAD_CEILING_PCT}%`,
    `Estimated runtime: ${runtimeText}`,
    `Battery: ${batteryText}`,
  );

  if (sizing.totalW > 0) {
    const over =
      sizing.loadPct > UPS_LOAD_CEILING_PCT
        ? " This selection is over the ceiling — step up a tier or drop load."
        : "";
    lines.push(
      "",
      `Select a ${formatVa(sizing.tierVa)} UPS.`,
      `IT load is ${sizing.loadPct}% of that tier. Keep it at or under ${UPS_LOAD_CEILING_PCT}%.${over} Estimated runtime ${runtimeText} on ${batteryText}.`,
    );
  }

  lines.push("", "Guidance", upsGuidance());
  return lines.join("\n");
}
