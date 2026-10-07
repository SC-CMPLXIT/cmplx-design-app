// NEC Chapter 9, Table 4 — internal diameter and area (sq in).
// NEC Chapter 9, Table 2 — minimum conduit bend radius (in), one-shot / full-shoe.
// Cable ODs and bend multipliers are typical low-voltage values (TIA / manufacturer), not a spec sheet.

export const TRADE_SIZES = [
  '1/2"',
  '3/4"',
  '1"',
  '1-1/4"',
  '1-1/2"',
  '2"',
  '2-1/2"',
  '3"',
  '3-1/2"',
  '4"',
] as const;

export type TradeSize = (typeof TRADE_SIZES)[number];

const TABLE2_BEND_RADIUS: Record<TradeSize, number> = {
  '1/2"': 4,
  '3/4"': 4.5,
  '1"': 5.75,
  '1-1/4"': 7.25,
  '1-1/2"': 8.25,
  '2"': 9.5,
  '2-1/2"': 10.5,
  '3"': 13,
  '3-1/2"': 15,
  '4"': 16,
};

export type ConduitSpec = {
  id: number;
  area: number;
  bendRadius: number;
};

function buildSizes(rows: Array<[TradeSize, number, number]>): Record<string, ConduitSpec> {
  return Object.fromEntries(
    rows.map(([size, id, area]) => [
      size,
      { id, area, bendRadius: TABLE2_BEND_RADIUS[size] },
    ]),
  );
}

export const CONDUIT_KINDS = ["EMT", "IMC", "RMC", "PVC Sch 40", "PVC Sch 80", "ENT"] as const;

export type ConduitKind = (typeof CONDUIT_KINDS)[number];

export const CONDUITS: Record<ConduitKind, Record<string, ConduitSpec>> = {
  EMT: buildSizes([
    ['1/2"', 0.622, 0.304],
    ['3/4"', 0.824, 0.533],
    ['1"', 1.049, 0.864],
    ['1-1/4"', 1.38, 1.496],
    ['1-1/2"', 1.61, 2.036],
    ['2"', 2.067, 3.356],
    ['2-1/2"', 2.731, 5.858],
    ['3"', 3.356, 8.846],
    ['3-1/2"', 3.834, 11.545],
    ['4"', 4.334, 14.753],
  ]),
  IMC: buildSizes([
    ['1/2"', 0.66, 0.342],
    ['3/4"', 0.864, 0.586],
    ['1"', 1.105, 0.959],
    ['1-1/4"', 1.448, 1.647],
    ['1-1/2"', 1.683, 2.225],
    ['2"', 2.15, 3.63],
    ['2-1/2"', 2.557, 5.135],
    ['3"', 3.176, 7.922],
    ['3-1/2"', 3.671, 10.584],
    ['4"', 4.166, 13.631],
  ]),
  RMC: buildSizes([
    ['1/2"', 0.632, 0.314],
    ['3/4"', 0.836, 0.549],
    ['1"', 1.063, 0.887],
    ['1-1/4"', 1.394, 1.526],
    ['1-1/2"', 1.624, 2.071],
    ['2"', 2.083, 3.408],
    ['2-1/2"', 2.489, 4.866],
    ['3"', 3.09, 7.499],
    ['3-1/2"', 3.57, 10.01],
    ['4"', 4.05, 12.882],
  ]),
  "PVC Sch 40": buildSizes([
    ['1/2"', 0.602, 0.285],
    ['3/4"', 0.804, 0.508],
    ['1"', 1.029, 0.832],
    ['1-1/4"', 1.36, 1.453],
    ['1-1/2"', 1.59, 1.986],
    ['2"', 2.047, 3.291],
    ['2-1/2"', 2.445, 4.695],
    ['3"', 3.042, 7.268],
    ['3-1/2"', 3.521, 9.737],
    ['4"', 3.998, 12.554],
  ]),
  "PVC Sch 80": buildSizes([
    ['1/2"', 0.526, 0.217],
    ['3/4"', 0.722, 0.409],
    ['1"', 0.936, 0.688],
    ['1-1/4"', 1.255, 1.237],
    ['1-1/2"', 1.476, 1.711],
    ['2"', 1.913, 2.874],
    ['2-1/2"', 2.29, 4.119],
    ['3"', 2.864, 6.442],
    ['3-1/2"', 3.326, 8.688],
    ['4"', 3.786, 11.258],
  ]),
  ENT: buildSizes([
    ['1/2"', 0.56, 0.246],
    ['3/4"', 0.76, 0.454],
    ['1"', 1, 0.785],
    ['1-1/4"', 1.34, 1.41],
    ['1-1/2"', 1.57, 1.936],
    ['2"', 2.02, 3.205],
  ]),
};

export type CablePreset = {
  name: string;
  od: number;
  bendMult: number;
};

export const CABLE_PRESETS: CablePreset[] = [
  { name: "Cat5e UTP", od: 0.21, bendMult: 4 },
  { name: "Cat6 UTP", od: 0.25, bendMult: 4 },
  { name: "Cat6A UTP", od: 0.3, bendMult: 4 },
  { name: "Cat6A F/UTP", od: 0.32, bendMult: 4 },
  { name: "Cat6A S/FTP", od: 0.35, bendMult: 8 },
  { name: "RG6 Coax", od: 0.27, bendMult: 10 },
  { name: "RG11 Coax", od: 0.4, bendMult: 10 },
  { name: "Fiber 2-strand", od: 0.2, bendMult: 10 },
  { name: "Fiber 6-strand", od: 0.27, bendMult: 10 },
  { name: "Fiber 12-strand", od: 0.35, bendMult: 10 },
  { name: "HDMI 18Gbps", od: 0.3, bendMult: 4 },
  { name: "16/2 Speaker", od: 0.22, bendMult: 6 },
  { name: "14/2 Speaker", od: 0.27, bendMult: 6 },
  { name: "12/2 Speaker", od: 0.32, bendMult: 6 },
  { name: "22/2 Control", od: 0.15, bendMult: 4 },
];

export type CableDraft = {
  id: string;
  name: string;
  od: string;
  qty: string;
  bendMult: string;
};

export type FillTone = "idle" | "pass" | "warn" | "fail";

export type JamCheck = {
  id: string;
  name: string;
  ratio: number;
  tone: Exclude<FillTone, "idle">;
  label: string;
};

export type CableBend = {
  id: string;
  minR: number;
  ok: boolean;
};

export type FillAssessment = {
  spec: ConduitSpec;
  size: string;
  totalCount: number;
  usedArea: number;
  fillPct: number;
  necLimit: number;
  recLimit: number;
  activeLimit: number;
  remainingArea: number;
  totalBendDeg: number;
  bendOk: boolean;
  availableBendRadius: number;
  usingOverride: boolean;
  status: { tone: FillTone; label: string };
  jamChecks: JamCheck[];
  bends: CableBend[];
};

export const CONDUIT_VIEW = {
  size: 320,
  cx: 160,
  cy: 160,
  conduitR: 140,
} as const;

export type PlacedCable = {
  x: number;
  y: number;
  r: number;
  name: string;
};

function finite(value: number | string): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function cableArea(od: number): number {
  if (od <= 0) return 0;
  return Math.PI * (od / 2) ** 2;
}

/** NEC Chapter 9, Table 1. One conductor 53%, two 31%, three or more 40%. */
export function necFillLimit(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 53;
  if (count === 2) return 31;
  return 40;
}

/** Best-practice pull derate. Not an NEC table. */
export function recommendDerate(necLimit: number, totalBendDeg: number, runFt: number): number {
  let derate = 0;
  if (totalBendDeg > 180 || runFt >= 100) derate = 10;
  else if (totalBendDeg > 90 || runFt >= 50) derate = 5;
  return Math.max(0, necLimit - derate);
}

export function jamAssessment(ratio: number): Pick<JamCheck, "tone" | "label"> {
  if (ratio < 2.5) return { tone: "pass", label: "Safe (cables stack)" };
  if (ratio >= 2.8 && ratio <= 3.2) return { tone: "fail", label: "Jam danger zone" };
  if (ratio > 2.5 && ratio < 2.8) return { tone: "warn", label: "Caution" };
  return { tone: "pass", label: "Safe (triangular pack)" };
}

export function sizesFor(kind: ConduitKind): string[] {
  return Object.keys(CONDUITS[kind]);
}

export function resolveSize(kind: ConduitKind, size: string): string {
  const sizes = sizesFor(kind);
  return CONDUITS[kind][size] ? size : sizes[0];
}

export function assessCableFill(
  kind: ConduitKind,
  requestedSize: string,
  cables: CableDraft[],
  run: {
    bends90: string;
    bends45: string;
    bends225: string;
    runLength: string;
    bendRadiusOverride: string;
    useRecommended: boolean;
  },
): FillAssessment {
  const size = resolveSize(kind, requestedSize);
  const spec = CONDUITS[kind][size];
  const totalBendDeg = finite(run.bends90) * 90 + finite(run.bends45) * 45 + finite(run.bends225) * 22.5;
  const override = finite(run.bendRadiusOverride);
  const usingOverride = override > 0;
  const availableBendRadius = usingOverride ? override : spec.bendRadius;

  const rows = cables.map((cable) => {
    const od = finite(cable.od);
    const qty = finite(cable.qty);
    const bendMult = finite(cable.bendMult);
    const minR = od > 0 && bendMult > 0 ? od * bendMult : 0;
    return {
      id: cable.id,
      name: cable.name.trim() || "Cable",
      od,
      qty,
      minR,
      ok: minR > 0 && minR <= availableBendRadius,
    };
  });

  const totalCount = rows.reduce((sum, row) => sum + Math.max(0, row.qty), 0);
  const usedArea = rows.reduce(
    (sum, row) => sum + cableArea(row.od) * Math.max(0, row.qty),
    0,
  );
  const fillPct = spec.area > 0 ? (usedArea / spec.area) * 100 : 0;
  const necLimit = necFillLimit(totalCount);
  const recLimit = recommendDerate(necLimit, totalBendDeg, finite(run.runLength));
  const activeLimit = run.useRecommended ? recLimit : necLimit;
  const remainingArea = Math.max(0, spec.area * (activeLimit / 100) - usedArea);

  const jamChecks: JamCheck[] = rows
    .filter((row) => row.qty === 3 && row.od > 0)
    .map((row) => {
      const ratio = spec.id / row.od;
      return { id: row.id, name: row.name, ratio, ...jamAssessment(ratio) };
    });

  const anyBendViolation = rows.some((row) => row.minR > 0 && !row.ok);
  const bendOk = totalBendDeg <= 360;

  let status: FillAssessment["status"];
  if (totalCount === 0) status = { tone: "idle", label: "Add cables" };
  else if (fillPct > activeLimit) {
    status = {
      tone: "fail",
      label: `Over ${run.useRecommended ? "recommended" : "NEC"} ${activeLimit}% limit`,
    };
  } else if (!bendOk) status = { tone: "fail", label: "Bends exceed NEC 360° max" };
  else if (anyBendViolation) status = { tone: "fail", label: "Cable bend radius violation" };
  else if (jamChecks.some((check) => check.tone === "fail")) {
    status = { tone: "fail", label: "Jam ratio in danger zone" };
  } else if (fillPct > activeLimit * 0.85) status = { tone: "warn", label: "Within limit · tight" };
  else if (jamChecks.some((check) => check.tone === "warn")) {
    status = { tone: "warn", label: "Jam ratio caution" };
  } else {
    status = {
      tone: "pass",
      label: `Within ${run.useRecommended ? "recommended" : "NEC"} ${activeLimit}% limit`,
    };
  }

  return {
    spec,
    size,
    totalCount,
    usedArea,
    fillPct,
    necLimit,
    recLimit,
    activeLimit,
    remainingArea,
    totalBendDeg,
    bendOk,
    availableBendRadius,
    usingOverride,
    status,
    jamChecks,
    bends: rows.map((row) => ({ id: row.id, minR: row.minR, ok: row.ok })),
  };
}

export function packConduit(
  cables: CableDraft[],
  internalDiameter: number,
  maxCircles = 160,
): { placed: PlacedCable[]; shown: number; total: number } {
  const { cx, cy, conduitR } = CONDUIT_VIEW;
  const expanded: Array<{ od: number; name: string }> = [];
  for (const cable of cables) {
    const od = finite(cable.od);
    const qty = finite(cable.qty);
    if (od <= 0 || qty <= 0) continue;
    const copies = Math.ceil(qty);
    for (let i = 0; i < copies; i += 1) {
      expanded.push({ od, name: cable.name.trim() || "Cable" });
    }
  }
  expanded.sort((a, b) => b.od - a.od);
  const total = expanded.length;
  const visible = expanded.slice(0, maxCircles);

  if (internalDiameter <= 0) {
    return { placed: [], shown: 0, total };
  }

  const scale = conduitR / (internalDiameter / 2);
  const placed: PlacedCable[] = [];
  for (const cable of visible) {
    const r = (cable.od / 2) * scale;
    if (!(r > 0) || r >= conduitR - 1.5) continue;
    const maxDist = conduitR - r - 1.5;
    const ringStep = 3.2;
    const rings = Math.ceil(maxDist / ringStep);
    let found: PlacedCable | null = null;
    for (let ring = 0; ring <= rings && !found; ring += 1) {
      const dist = Math.min(maxDist, ring * ringStep);
      const steps =
        dist < 1
          ? 1
          : Math.min(24, Math.max(8, Math.ceil((2 * Math.PI * dist) / Math.max(8, r * 0.85))));
      for (let step = 0; step < steps; step += 1) {
        const angle = (step / steps) * Math.PI * 2 + ring * 0.41;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        const need = r + 0.75;
        let hit = false;
        for (let index = 0; index < placed.length; index += 1) {
          const dot = placed[index];
          const dx = dot.x - x;
          const dy = dot.y - y;
          const min = dot.r + need;
          if (dx * dx + dy * dy < min * min) {
            hit = true;
            break;
          }
        }
        if (!hit) {
          found = { x, y, r, name: cable.name };
          break;
        }
      }
    }
    if (found) placed.push(found);
  }

  return { placed, shown: placed.length, total };
}
