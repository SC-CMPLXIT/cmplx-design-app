import { useMemo, useState, type ReactNode } from "react";
import {
  CABLE_FILL_GUIDANCE,
  CABLE_PRESETS,
  CONDUIT_KINDS,
  CONDUIT_VIEW,
  assessCableFill,
  formatCableFillSummary,
  packConduit,
  sizesFor,
  type CableDraft,
  type CablePreset,
  type ConduitKind,
  type FillAssessment,
  type FillTone,
} from "@/lib/cable-fill";
import { cn } from "@/lib/cn";
import { formatDate, todayIsoDate } from "@/lib/dates";
import { ToolActions, ToolPrint, ToolPrintSection } from "./ToolActions";
import { Banner, Button, Field, PageHeader, fieldControlClass } from "./ui";

const CABLE_COLORS = [
  "#9a4a2a",
  "#1f4d3a",
  "#3d4a62",
  "#6e3018",
  "#5c3d4a",
  "#8a6232",
  "#24362c",
  "#4a3428",
];

const TONE_CLASS: Record<FillTone, string> = {
  pass: "border-emerald-300 bg-emerald-50 text-emerald-950",
  warn: "border-amber-300 bg-amber-50 text-amber-950",
  fail: "border-rose-300 bg-rose-50 text-rose-950",
  idle: "border-rule bg-paper-2 text-ink-soft",
};

function sampleCables(): CableDraft[] {
  return [
    { id: crypto.randomUUID(), name: "Cat6A UTP", od: "0.30", qty: "8", bendMult: "4" },
    { id: crypto.randomUUID(), name: "Fiber 12-strand", od: "0.35", qty: "1", bendMult: "10" },
  ];
}

function formatCount(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

export function CableFillCalculator() {
  const [kind, setKind] = useState<ConduitKind>("EMT");
  const [size, setSize] = useState('1"');
  const [cables, setCables] = useState<CableDraft[]>(sampleCables);
  const [customName, setCustomName] = useState("");
  const [customOd, setCustomOd] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customError, setCustomError] = useState<string | null>(null);
  const [bends90, setBends90] = useState("2");
  const [bends45, setBends45] = useState("0");
  const [bends225, setBends225] = useState("0");
  const [runLength, setRunLength] = useState("75");
  const [bendRadiusOverride, setBendRadiusOverride] = useState("");
  const [useRecommended, setUseRecommended] = useState(true);

  const assessment = useMemo(
    () =>
      assessCableFill(kind, size, cables, {
        bends90,
        bends45,
        bends225,
        runLength,
        bendRadiusOverride,
        useRecommended,
      }),
    [kind, size, cables, bends90, bends45, bends225, runLength, bendRadiusOverride, useRecommended],
  );

  const packed = useMemo(
    () => packConduit(cables, assessment.spec.id),
    [cables, assessment.spec.id],
  );

  const sizes = sizesFor(kind);
  const bendById = new Map(assessment.bends.map((row) => [row.id, row]));
  const names = [...new Set(cables.map((cable) => cable.name.trim() || "Cable"))];
  const showNecRing = useRecommended && assessment.recLimit !== assessment.necLimit;
  const summary = formatCableFillSummary({
    kind,
    cables,
    bends90,
    bends45,
    bends225,
    runLength,
    bendRadiusOverride,
    useRecommended,
    assessment,
    printedOn: formatDate(todayIsoDate()),
  });
  const fillHot =
    assessment.fillPct > assessment.activeLimit
      ? "bg-rose-600"
      : assessment.fillPct > assessment.activeLimit * 0.85
        ? "bg-amber-500"
        : "bg-emerald-600";

  function addPreset(preset: CablePreset) {
    setCables((prev) => {
      const existing = prev.find(
        (cable) => cable.name === preset.name && Number(cable.od) === preset.od,
      );
      if (existing) {
        return prev.map((cable) =>
          cable.id === existing.id
            ? { ...cable, qty: String((Number(cable.qty) || 0) + 1) }
            : cable,
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: preset.name,
          od: preset.od.toFixed(2),
          qty: "1",
          bendMult: String(preset.bendMult),
        },
      ];
    });
  }

  function addCustom() {
    const od = Number(customOd);
    const qty = Number(customQty);
    if (!customName.trim() || !Number.isFinite(od) || od <= 0 || !Number.isFinite(qty) || qty <= 0) {
      setCustomError("Enter a name, an OD greater than zero, and a quantity.");
      return;
    }
    setCustomError(null);
    setCables((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: customName.trim(),
        od: customOd,
        qty: customQty,
        bendMult: "6",
      },
    ]);
    setCustomName("");
    setCustomOd("");
    setCustomQty("1");
  }

  function updateCable(id: string, field: "name" | "od" | "qty" | "bendMult", value: string) {
    setCables((prev) => prev.map((cable) => (cable.id === id ? { ...cable, [field]: value } : cable)));
  }

  return (
    <div
      className="print-sheet"
      data-cable-fill
      data-status={assessment.status.tone}
      data-fill={assessment.fillPct.toFixed(1)}
      data-limit={String(assessment.activeLimit)}
    >
      <div className="no-print">
      <PageHeader
        eyebrow="Tools · NEC Chapter 9"
        title="Cable fill"
        description="Conduit fill against Table 1, with Table 2 bend radius, jam ratio, and a best-practice pull derate. Nothing here is saved to a project."
        actions={
          <div className="flex max-w-full flex-col gap-3 sm:items-end">
            <p
              role="status"
              className={cn(
                "max-w-full rounded-sm border px-3 py-2 text-sm leading-5",
                TONE_CLASS[assessment.status.tone],
              )}
            >
              <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                {assessment.status.tone}
              </span>
              {assessment.status.label}
            </p>
            <ToolActions summary={summary} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel title="Conduit">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type">
                <select
                  className={fieldControlClass}
                  value={kind}
                  onChange={(event) => setKind(event.target.value as ConduitKind)}
                >
                  {CONDUIT_KINDS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Trade size">
                <select
                  className={fieldControlClass}
                  value={assessment.size}
                  onChange={(event) => setSize(event.target.value)}
                >
                  {sizes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Internal dia." value={`${assessment.spec.id.toFixed(3)} in`} />
              <Stat label="Internal area" value={`${assessment.spec.area.toFixed(3)} in²`} />
              <Stat label="Min bend R" value={`${assessment.spec.bendRadius.toFixed(2)} in`} />
            </div>
          </Panel>

          <Panel
            title="Run geometry"
            aside={
              <span
                className={cn(
                  "font-mono text-xs",
                  assessment.bendOk ? "text-ink-soft" : "text-rose-800",
                )}
              >
                Σ {formatCount(assessment.totalBendDeg)}° / 360°
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="90° bends" value={bends90} onChange={setBends90} />
              <NumberField label="45° bends" value={bends45} onChange={setBends45} />
              <NumberField label="22.5° bends" value={bends225} onChange={setBends225} />
              <NumberField label="Run length (ft)" value={runLength} onChange={setRunLength} />
              <NumberField
                label="Bend R (in)"
                value={bendRadiusOverride}
                onChange={setBendRadiusOverride}
                step="0.25"
                placeholder={assessment.spec.bendRadius.toFixed(2)}
              />
            </div>
            {!assessment.bendOk ? (
              <div className="mt-3">
                <Banner tone="danger">
                  Total bends exceed 360°. NEC requires a pull point or junction box before continuing.
                </Banner>
              </div>
            ) : null}
          </Panel>

          <Panel title="Quick add">
            <div className="flex flex-wrap gap-2">
              {CABLE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => addPreset(preset)}
                  aria-label={`Add ${preset.name}`}
                  className="rounded-sm border border-rule bg-white px-2.5 py-1.5 text-left text-xs text-ink transition hover:border-ink hover:bg-ink hover:text-paper"
                >
                  {preset.name}
                  <span className="ml-1.5 font-mono text-[10px] opacity-70">
                    {preset.od.toFixed(2)}"
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title={`Cables in conduit (${formatCount(assessment.totalCount)})`}
            aside={
              cables.length > 0 ? (
                <button
                  type="button"
                  className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
                  onClick={() => setCables([])}
                >
                  Clear all
                </button>
              ) : null
            }
          >
            {cables.length === 0 ? (
              <p className="rounded-sm border border-dashed border-rule px-4 py-8 text-center text-sm text-ink-soft">
                No cables added.
              </p>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {cables.map((cable) => {
                  const bend = bendById.get(cable.id);
                  const violated = Boolean(bend && bend.minR > 0 && !bend.ok);
                  return (
                    <li key={cable.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Cable name"
                          value={cable.name}
                          onChange={(event) => updateCable(cable.id, "name", event.target.value)}
                          className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm text-ink outline-none focus:border-copper"
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${cable.name || "cable"}`}
                          className="shrink-0 text-xs text-ink-soft underline underline-offset-2 hover:text-rose-800"
                          onClick={() => setCables((prev) => prev.filter((row) => row.id !== cable.id))}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <MiniNumber
                          label="OD (in)"
                          value={cable.od}
                          step="0.01"
                          onChange={(value) => updateCable(cable.id, "od", value)}
                        />
                        <MiniNumber
                          label="Bend × OD"
                          value={cable.bendMult}
                          step="1"
                          onChange={(value) => updateCable(cable.id, "bendMult", value)}
                        />
                        <MiniNumber
                          label="Qty"
                          value={cable.qty}
                          step="1"
                          min="0"
                          onChange={(value) => updateCable(cable.id, "qty", value)}
                        />
                        <div className="min-w-0">
                          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                            Min bend R
                          </p>
                          <p
                            className={cn(
                              "py-2 font-mono text-sm",
                              violated ? "text-rose-800" : "text-ink",
                            )}
                          >
                            {bend ? `${bend.minR.toFixed(2)}"` : "—"}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <form
              className="mt-4 border-t border-rule pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                addCustom();
              }}
            >
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                Custom cable
              </p>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_5rem_auto] sm:items-end">
                <Field label="Name">
                  <input
                    className={fieldControlClass}
                    value={customName}
                    placeholder="Cable name"
                    onChange={(event) => setCustomName(event.target.value)}
                  />
                </Field>
                <Field label="OD (in)">
                  <input
                    className={cn(fieldControlClass, "font-mono")}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.25"
                    value={customOd}
                    onChange={(event) => setCustomOd(event.target.value)}
                  />
                </Field>
                <Field label="Qty">
                  <input
                    className={cn(fieldControlClass, "font-mono")}
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={customQty}
                    onChange={(event) => setCustomQty(event.target.value)}
                  />
                </Field>
                <Button type="submit" className="w-full sm:w-auto">
                  Add
                </Button>
              </div>
              {customError ? <p className="mt-2 text-sm text-rose-800">{customError}</p> : null}
            </form>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Cross section">
            <div className="mx-auto aspect-square w-full max-w-sm">
              <CrossSection
                placed={packed.placed}
                names={names}
                activeLimit={assessment.activeLimit}
                necLimit={assessment.necLimit}
                showNecRing={showNecRing}
              />
            </div>
            <ul className="mt-3 space-y-1 text-xs text-ink-soft">
              <li className="flex items-center gap-2">
                <span className="inline-block w-4 border-t border-dashed border-copper" />
                Active limit · {assessment.activeLimit}%
              </li>
              {showNecRing ? (
                <li className="flex items-center gap-2">
                  <span className="inline-block w-4 border-t border-dashed border-ink-soft" />
                  NEC max · {assessment.necLimit}%
                </li>
              ) : null}
            </ul>
            {packed.total > packed.shown ? (
              <p className="mt-2 text-xs leading-5 text-ink-soft">
                Packed {packed.shown} of {packed.total} inside the wall. Area fill still counts every
                cable — circle packing does not always reach the area limit.
              </p>
            ) : null}
          </Panel>

          <section className="rounded-sm bg-ink p-4 text-paper sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper/60">Fill</h2>
              <label className="flex items-center gap-2 text-xs text-paper/70">
                <input
                  type="checkbox"
                  className="accent-copper"
                  checked={useRecommended}
                  onChange={(event) => setUseRecommended(event.target.checked)}
                />
                Derate
              </label>
            </div>
            <div className="space-y-3">
              <FillMetric label="Actual fill" value={`${assessment.fillPct.toFixed(1)}%`} accent />
              <FillMetric
                label="NEC code limit"
                value={`${assessment.necLimit}%`}
                sub={`${formatCount(assessment.totalCount)} cable${assessment.totalCount === 1 ? "" : "s"}`}
              />
              {useRecommended ? (
                <FillMetric
                  label="Recommended"
                  value={`${assessment.recLimit}%`}
                  sub={
                    assessment.recLimit < assessment.necLimit
                      ? `−${assessment.necLimit - assessment.recLimit}% derate`
                      : "no derate"
                  }
                />
              ) : null}
              <FillMetric label="Used area" value={`${assessment.usedArea.toFixed(3)} in²`} />
              <FillMetric label="Available" value={`${assessment.remainingArea.toFixed(3)} in²`} />
            </div>
            <div className="mt-4 border-t border-paper/20 pt-4">
              <div className="relative h-2 overflow-hidden rounded-sm bg-paper/15">
                <div
                  className={cn("h-full", fillHot)}
                  style={{ width: `${Math.min(100, Math.max(0, assessment.fillPct))}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-px bg-paper"
                  style={{ left: `${Math.min(100, Math.max(0, assessment.activeLimit))}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-paper/55">
                <span>0%</span>
                <span>{assessment.activeLimit}%</span>
                <span>100%</span>
              </div>
            </div>
          </section>

          <Panel title="Pull analysis">
            <div className="mb-4">
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="font-mono uppercase tracking-[0.14em] text-ink-soft">Bend total</span>
                <span className={cn("font-mono", assessment.bendOk ? "text-ink" : "text-rose-800")}>
                  {formatCount(assessment.totalBendDeg)}° / 360°
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-paper-2">
                <div
                  className={assessment.bendOk ? "h-full bg-ink" : "h-full bg-rose-700"}
                  style={{
                    width: `${Math.min(100, Math.max(0, (assessment.totalBendDeg / 360) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
                <span className="font-mono uppercase tracking-[0.14em] text-ink-soft">Bend radius</span>
                <span className="font-mono text-ink">
                  {assessment.availableBendRadius.toFixed(2)}"{" "}
                  {assessment.usingOverride ? "override" : "Table 2"}
                </span>
              </div>
              {cables.length === 0 ? (
                <p className="text-xs text-ink-soft">No cables to check</p>
              ) : (
                <ul className="space-y-1.5">
                  {cables.map((cable) => {
                    const bend = bendById.get(cable.id);
                    const violated = Boolean(bend && bend.minR > 0 && !bend.ok);
                    return (
                      <li key={cable.id} className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate text-ink">{cable.name || "Cable"}</span>
                        <span className={cn("shrink-0 font-mono", violated ? "text-rose-800" : "text-emerald-800")}>
                          {bend ? `${bend.minR.toFixed(2)}" req` : "—"}
                          {violated ? " · over" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                Jam ratio
              </p>
              {assessment.jamChecks.length === 0 ? (
                <p className="text-xs leading-5 text-ink-soft">
                  Checked when a row is exactly three cables of one outside diameter.
                </p>
              ) : (
                <ul className="space-y-2">
                  {assessment.jamChecks.map((check) => (
                    <li key={check.id} className="text-xs">
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <span className="min-w-0 text-ink">{check.name}</span>
                        <span
                          className={cn(
                            "shrink-0 font-mono",
                            check.tone === "fail"
                              ? "text-rose-800"
                              : check.tone === "warn"
                                ? "text-amber-800"
                                : "text-emerald-800",
                          )}
                        >
                          {check.ratio.toFixed(2)} · {check.label}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <Banner>{CABLE_FILL_GUIDANCE}</Banner>
        </div>
      </div>
      </div>

      <CableFillPrint
        kind={kind}
        cables={cables}
        bends90={bends90}
        bends45={bends45}
        bends225={bends225}
        runLength={runLength}
        useRecommended={useRecommended}
        assessment={assessment}
        names={names}
        showNecRing={showNecRing}
        placed={packed.placed}
        packedShown={packed.shown}
        packedTotal={packed.total}
      />
    </div>
  );
}

function CableFillPrint({
  kind,
  cables,
  bends90,
  bends45,
  bends225,
  runLength,
  useRecommended,
  assessment,
  names,
  showNecRing,
  placed,
  packedShown,
  packedTotal,
}: {
  kind: ConduitKind;
  cables: CableDraft[];
  bends90: string;
  bends45: string;
  bends225: string;
  runLength: string;
  useRecommended: boolean;
  assessment: FillAssessment;
  names: string[];
  showNecRing: boolean;
  placed: Array<{ x: number; y: number; r: number; name: string }>;
  packedShown: number;
  packedTotal: number;
}) {
  const bendById = new Map(assessment.bends.map((row) => [row.id, row]));
  const cableWord = assessment.totalCount === 1 ? "cable" : "cables";

  return (
    <ToolPrint name="Cable fill" tone={assessment.status.tone} label={assessment.status.label}>
      <ToolPrintSection title="Conduit">
        <p>
          {kind} · {assessment.size}
        </p>
        <p>Internal diameter {assessment.spec.id.toFixed(3)} in</p>
        <p>Internal area {assessment.spec.area.toFixed(3)} in²</p>
        <p>Table 2 min bend radius {assessment.spec.bendRadius.toFixed(2)} in</p>
        <p>
          Bend radius used {assessment.availableBendRadius.toFixed(2)} in (
          {assessment.usingOverride ? "override" : "Table 2"})
        </p>
        <p>Derate {useRecommended ? "on" : "off"}</p>
      </ToolPrintSection>

      <ToolPrintSection title="Run">
        <p>
          90° × {bends90.trim() || "0"} · 45° × {bends45.trim() || "0"} · 22.5° ×{" "}
          {bends225.trim() || "0"} · {runLength.trim() || "0"} ft
        </p>
        <p>
          Bend total {formatCount(assessment.totalBendDeg)}° / 360° —{" "}
          {assessment.bendOk ? "within limit" : "exceeds 360°. Add a pull point."}
        </p>
      </ToolPrintSection>

      <ToolPrintSection title={`Cables (${formatCount(assessment.totalCount)})`}>
        {cables.length === 0 ? (
          <p>No cables.</p>
        ) : (
          <ul>
            {cables.map((cable) => {
              const bend = bendById.get(cable.id);
              const bendState =
                !bend || bend.minR <= 0 ? "not checked" : bend.ok ? "ok" : "over available radius";
              return (
                <li key={cable.id}>
                  {cable.name.trim() || "Cable"} — OD {cable.od.trim() || "0"} in — qty{" "}
                  {cable.qty.trim() || "0"} — bend {cable.bendMult.trim() || "0"}× OD — min bend{" "}
                  {bend ? `${bend.minR.toFixed(2)} in` : "—"} — {bendState}
                </li>
              );
            })}
          </ul>
        )}
      </ToolPrintSection>

      <ToolPrintSection title="Fill">
        <p>Actual {assessment.fillPct.toFixed(1)}%</p>
        <p>
          NEC code limit {assessment.necLimit}% ({formatCount(assessment.totalCount)} {cableWord})
        </p>
        <p>
          Recommended {assessment.recLimit}%
          {assessment.recLimit < assessment.necLimit
            ? ` (−${assessment.necLimit - assessment.recLimit}% derate)`
            : " (no derate)"}
        </p>
        <p>
          Active limit {assessment.activeLimit}% ({useRecommended ? "recommended" : "NEC"})
        </p>
        <p>Used area {assessment.usedArea.toFixed(3)} in²</p>
        <p>Available {assessment.remainingArea.toFixed(3)} in²</p>
      </ToolPrintSection>

      <ToolPrintSection title="Cross section">
        <div className="aspect-square w-40 max-w-full">
          <CrossSection
            placed={placed}
            names={names}
            activeLimit={assessment.activeLimit}
            necLimit={assessment.necLimit}
            showNecRing={showNecRing}
          />
        </div>
        <p>
          Dashed ring is the active limit at {assessment.activeLimit}%.
          {showNecRing ? ` NEC max is ${assessment.necLimit}%.` : ""}
        </p>
        {packedTotal > packedShown ? (
          <p>
            Packed {packedShown} of {packedTotal} inside the wall. Area fill still counts every
            cable.
          </p>
        ) : null}
      </ToolPrintSection>

      <ToolPrintSection title="Jam ratio">
        {assessment.jamChecks.length === 0 ? (
          <p>None. Checked when a row is exactly three cables of one outside diameter.</p>
        ) : (
          <ul>
            {assessment.jamChecks.map((check) => (
              <li key={check.id}>
                {check.name} — {check.ratio.toFixed(2)} — {check.tone.toUpperCase()} — {check.label}
              </li>
            ))}
          </ul>
        )}
      </ToolPrintSection>

      <ToolPrintSection title="Guidance">
        <p>{CABLE_FILL_GUIDANCE}</p>
      </ToolPrintSection>
    </ToolPrint>
  );
}

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-rule bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-rule bg-paper px-2 py-2 sm:px-3">
      <p className="break-words font-mono text-[10px] uppercase leading-snug tracking-[0.08em] text-ink-soft">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-ink">{value}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        className={cn(fieldControlClass, "font-mono")}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function MiniNumber({
  label,
  value,
  onChange,
  step,
  min = "0",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: string;
  min?: string;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
      <input
        aria-label={label}
        className={cn(fieldControlClass, "px-2 font-mono")}
        type="number"
        min={min}
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function FillMetric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="min-w-0 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/55">
        {label}
        {sub ? (
          <span className="mt-0.5 block font-sans text-xs normal-case tracking-normal text-paper/70">
            {sub}
          </span>
        ) : null}
      </p>
      <p className={cn("shrink-0 font-mono", accent ? "text-2xl text-paper" : "text-base text-paper/80")}>
        {value}
      </p>
    </div>
  );
}

function CrossSection({
  placed,
  names,
  activeLimit,
  necLimit,
  showNecRing,
}: {
  placed: Array<{ x: number; y: number; r: number; name: string }>;
  names: string[];
  activeLimit: number;
  necLimit: number;
  showNecRing: boolean;
}) {
  const { size, cx, cy, conduitR } = CONDUIT_VIEW;
  const limitR = conduitR * Math.sqrt(Math.max(0, activeLimit) / 100);
  const necR = conduitR * Math.sqrt(Math.max(0, necLimit) / 100);
  const colorFor = (name: string) => CABLE_COLORS[Math.max(0, names.indexOf(name)) % CABLE_COLORS.length];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" role="img" aria-label="Conduit cross section">
      <circle cx={cx} cy={cy} r={conduitR + 6} fill="none" stroke="#0c0c0b" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={conduitR} fill="#efeae1" stroke="#0c0c0b" strokeWidth="1" />
      {showNecRing ? (
        <circle
          cx={cx}
          cy={cy}
          r={necR}
          fill="none"
          stroke="#3c3832"
          strokeWidth="0.8"
          strokeDasharray="2 3"
          opacity="0.7"
        />
      ) : null}
      {limitR > 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={limitR}
          fill="none"
          stroke="#9a4a2a"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
      ) : null}
      {placed.map((dot, index) => (
        <circle
          key={`${dot.name}-${index}`}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill={colorFor(dot.name)}
          opacity="0.9"
          stroke="#0c0c0b"
          strokeWidth="0.5"
        />
      ))}
      <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke="#3c3832" strokeWidth="0.5" />
      <line x1={cx} y1={cy - 4} x2={cx} y2={cy + 4} stroke="#3c3832" strokeWidth="0.5" />
    </svg>
  );
}
