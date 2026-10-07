import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDate, todayIsoDate } from "@/lib/dates";
import {
  DEFAULT_UPS_CONFIG,
  DEFAULT_UPS_DEVICES,
  POWER_FACTORS,
  SAFETY_MARGINS,
  UPS_LOAD_CEILING_PCT,
  UPS_PRESETS,
  formatMinutes,
  formatUpsSummary,
  formatVa,
  formatWatts,
  formatWh,
  parseUpsNumber,
  sizeUps,
  upsGuidance,
  upsPreset,
  type UpsMode,
  type UpsPresetKey,
  type UpsSizing,
  type UpsTone,
} from "@/lib/ups";
import { ToolActions, ToolPrint, ToolPrintSection } from "./ToolActions";
import { Banner, Button, Field, PageHeader, fieldControlClass } from "./ui";

type DeviceRow = {
  id: string;
  type: UpsPresetKey;
  label: string;
  watts: string;
  qty: string;
};

const TONE_CLASS: Record<UpsTone, string> = {
  pass: "border-emerald-300 bg-emerald-50 text-emerald-950",
  warn: "border-amber-300 bg-amber-50 text-amber-950",
  fail: "border-rose-300 bg-rose-50 text-rose-950",
  idle: "border-rule bg-paper-2 text-ink-soft",
};

function seedDevices(): DeviceRow[] {
  return DEFAULT_UPS_DEVICES.map((device) => ({
    id: device.id,
    type: device.type,
    label: device.label,
    watts: String(device.watts),
    qty: String(device.qty),
  }));
}

function trimNumber(value: number, digits: number): string {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}

export function UpsCalculator() {
  const [devices, setDevices] = useState<DeviceRow[]>(seedDevices);
  const [powerFactor, setPowerFactor] = useState(String(DEFAULT_UPS_CONFIG.powerFactor));
  const [margin, setMargin] = useState(String(DEFAULT_UPS_CONFIG.margin));
  const [efficiency, setEfficiency] = useState(String(DEFAULT_UPS_CONFIG.efficiencyPct));
  const [mode, setMode] = useState<UpsMode>("battery");
  const [batteryWh, setBatteryWh] = useState(String(DEFAULT_UPS_CONFIG.batteryWh));
  const [targetMinutes, setTargetMinutes] = useState("60");

  const sizing = useMemo(
    () =>
      sizeUps({
        devices: devices.map((device) => ({
          watts: parseUpsNumber(device.watts),
          qty: parseUpsNumber(device.qty),
        })),
        powerFactor: parseUpsNumber(powerFactor),
        margin: parseUpsNumber(margin),
        efficiencyPct: parseUpsNumber(efficiency),
        mode,
        batteryWh: parseUpsNumber(batteryWh),
        targetMinutes: parseUpsNumber(targetMinutes),
      }),
    [devices, powerFactor, margin, efficiency, mode, batteryWh, targetMinutes],
  );

  const barPct = Math.min(100, Math.max(0, sizing.loadPct));
  const barClass =
    sizing.status.tone === "fail"
      ? "bg-rose-600"
      : sizing.status.tone === "warn"
        ? "bg-amber-500"
        : sizing.status.tone === "pass"
          ? "bg-emerald-600"
          : "bg-paper/40";

  function updateDevice(id: string, field: "label" | "watts" | "qty", value: string) {
    setDevices((prev) => prev.map((device) => (device.id === id ? { ...device, [field]: value } : device)));
  }

  function updateType(id: string, key: UpsPresetKey) {
    const preset = upsPreset(key);
    if (!preset) return;
    setDevices((prev) =>
      prev.map((device) => {
        if (device.id !== id) return device;
        return {
          ...device,
          type: key,
          label: preset.label,
          watts: key === "custom" ? device.watts : String(preset.watts),
        };
      }),
    );
  }

  function addDevice() {
    const preset = UPS_PRESETS[0];
    setDevices((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: preset.key,
        label: preset.label,
        watts: String(preset.watts),
        qty: "1",
      },
    ]);
  }

  function switchMode(next: UpsMode) {
    if (next === mode) return;
    if (next === "runtime") {
      setTargetMinutes(sizing.runtimeMin == null ? "0" : trimNumber(sizing.runtimeMin, 1));
    } else {
      setBatteryWh(sizing.batteryWh == null ? "0" : String(Math.round(sizing.batteryWh)));
    }
    setMode(next);
  }

  const runtimeText = sizing.runtimeMin == null ? "—" : formatMinutes(sizing.runtimeMin);
  const batteryText = sizing.batteryWh == null ? "—" : formatWh(sizing.batteryWh);
  const derivedRuntime = sizing.runtimeMin == null ? "—" : trimNumber(sizing.runtimeMin, 1);
  const derivedBattery = sizing.batteryWh == null ? "—" : Math.round(sizing.batteryWh).toLocaleString("en-US");
  const summary = formatUpsSummary({
    devices,
    powerFactor,
    margin,
    efficiency,
    mode,
    batteryWh,
    targetMinutes,
    sizing,
    printedOn: formatDate(todayIsoDate()),
  });
  const powerFactorLabel = POWER_FACTORS.find((option) => String(option.value) === powerFactor)?.label ?? powerFactor;
  const marginLabel = SAFETY_MARGINS.find((option) => String(option.value) === margin)?.label ?? margin;

  return (
    <div
      className="print-sheet"
      data-ups
      data-mode={mode}
      data-status={sizing.status.tone}
      data-load={String(sizing.loadPct)}
      data-tier={String(sizing.tierVa)}
    >
      <div className="no-print">
      <PageHeader
        eyebrow="Tools · IT load"
        title="UPS"
        description="Size a UPS from IT watts, power factor, and battery runtime. Nothing here is saved to a project, brief, or bill of materials."
        actions={
          <div className="flex max-w-full flex-col gap-3 sm:items-end">
            <p
              role="status"
              className={cn(
                "max-w-full rounded-sm border px-3 py-2 text-sm leading-5",
                TONE_CLASS[sizing.status.tone],
              )}
            >
              <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                {sizing.status.tone}
              </span>
              {sizing.status.label}
            </p>
            <ToolActions summary={summary} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel
            title={`Devices (${devices.length})`}
            aside={
              devices.length > 0 ? (
                <button
                  type="button"
                  className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
                  onClick={() => setDevices([])}
                >
                  Clear all
                </button>
              ) : null
            }
          >
            {devices.length === 0 ? (
              <p className="rounded-sm border border-dashed border-rule px-4 py-8 text-center text-sm text-ink-soft">
                No devices. Add a preset to size the load.
              </p>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {devices.map((device) => {
                  const lineW = parseUpsNumber(device.watts) * parseUpsNumber(device.qty);
                  return (
                    <li key={device.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Device label"
                          value={device.label}
                          onChange={(event) => updateDevice(device.id, "label", event.target.value)}
                          className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm text-ink outline-none focus:border-copper"
                        />
                        <span className="shrink-0 font-mono text-xs text-ink-soft">{formatWatts(lineW)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${device.label || "device"}`}
                          className="shrink-0 text-xs text-ink-soft underline underline-offset-2 hover:text-rose-800"
                          onClick={() => setDevices((prev) => prev.filter((row) => row.id !== device.id))}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <label className="col-span-2 min-w-0 sm:col-span-2">
                          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                            Type
                          </span>
                          <select
                            aria-label="Device type"
                            className={fieldControlClass}
                            value={device.type}
                            onChange={(event) => updateType(device.id, event.target.value as UpsPresetKey)}
                          >
                            {UPS_PRESETS.map((preset) => (
                              <option key={preset.key} value={preset.key}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <MiniNumber
                          label="Watts"
                          value={device.watts}
                          step="1"
                          onChange={(value) => updateDevice(device.id, "watts", value)}
                        />
                        <MiniNumber
                          label="Qty"
                          value={device.qty}
                          step="1"
                          onChange={(value) => updateDevice(device.id, "qty", value)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-4">
              <Button type="button" variant="ghost" onClick={addDevice}>
                Add device
              </Button>
            </div>
          </Panel>

          <Panel title="Configuration">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Power factor" hint="Apparent power is watts ÷ this factor.">
                <select
                  className={fieldControlClass}
                  value={powerFactor}
                  onChange={(event) => setPowerFactor(event.target.value)}
                >
                  {POWER_FACTORS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Safety margin" hint="Applied after VA, before the catalog tier.">
                <select
                  className={fieldControlClass}
                  value={margin}
                  onChange={(event) => setMargin(event.target.value)}
                >
                  {SAFETY_MARGINS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                Battery and runtime
              </p>
              <div role="group" aria-label="Sizing direction" className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <ModeButton
                  pressed={mode === "battery"}
                  onClick={() => switchMode("battery")}
                  title="Battery → runtime"
                  detail="Enter watt-hours"
                />
                <ModeButton
                  pressed={mode === "runtime"}
                  onClick={() => switchMode("runtime")}
                  title="Runtime → battery"
                  detail="Enter minutes"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {mode === "battery" ? (
                <>
                  <NumberField label="Battery capacity (Wh)" value={batteryWh} onChange={setBatteryWh} />
                  <Field label="Estimated runtime (min)" hint="Calculated. Switch mode to edit minutes.">
                    <input
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      value={derivedRuntime}
                      className={cn(fieldControlClass, "bg-paper-2 font-mono text-ink-soft")}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <NumberField
                    label="Target runtime (min)"
                    value={targetMinutes}
                    onChange={setTargetMinutes}
                    step="0.1"
                  />
                  <Field label="Required battery (Wh)" hint="Calculated. Switch mode to edit watt-hours.">
                    <input
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      value={derivedBattery}
                      className={cn(fieldControlClass, "bg-paper-2 font-mono text-ink-soft")}
                    />
                  </Field>
                </>
              )}
              <NumberField
                label="UPS efficiency (%)"
                value={efficiency}
                onChange={setEfficiency}
                step="1"
              />
            </div>
            {parseUpsNumber(efficiency) <= 0 ? (
              <div className="mt-3">
                <Banner tone="warn">Enter a UPS efficiency above 0% to convert battery and runtime.</Banner>
              </div>
            ) : null}
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <section className="rounded-sm bg-ink p-4 text-paper sm:p-5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper/60">Sizing</h2>
            <p className="mt-3 font-serif text-3xl tracking-tight">
              {sizing.totalW > 0 ? formatVa(sizing.tierVa) : "—"}
            </p>
            <p className="mt-1 text-sm leading-5 text-paper/70">
              {sizing.totalW > 0
                ? sizing.tierInCatalog
                  ? "Smallest common tier at or above the margined VA."
                  : "Above 15,000 VA. Rounded up to the next 1,000 VA."
                : "Add devices to recommend a tier."}
            </p>
            <div className="mt-5 space-y-3">
              <Metric label="Total IT load" value={formatWatts(sizing.totalW)} />
              <Metric label="Apparent power" value={formatVa(sizing.apparentVa)} sub="W ÷ power factor" />
              <Metric label="With margin" value={formatVa(sizing.recommendedVa)} sub="VA × safety margin" />
              <Metric label="UPS tier" value={sizing.totalW > 0 ? formatVa(sizing.tierVa) : "—"} />
              <Metric label="Load of tier" value={sizing.totalW > 0 ? `${sizing.loadPct}%` : "—"} accent />
              <Metric label="Est. runtime" value={runtimeText} sub={batteryText} />
            </div>
            <div className="mt-4 border-t border-paper/20 pt-4">
              <div className="relative h-2 overflow-hidden rounded-sm bg-paper/15">
                <div className={cn("h-full", barClass)} style={{ width: `${barPct}%` }} />
                <div
                  className="absolute top-0 bottom-0 w-px bg-paper"
                  style={{ left: `${UPS_LOAD_CEILING_PCT}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-paper/55">
                <span>0%</span>
                <span>{UPS_LOAD_CEILING_PCT}% ceiling</span>
                <span>100%</span>
              </div>
            </div>
          </section>

          {sizing.totalW > 0 ? (
            <div className={cn("rounded-sm border px-4 py-3 text-sm leading-6", TONE_CLASS[sizing.status.tone])}>
              <p className="font-medium">Select a {formatVa(sizing.tierVa)} UPS.</p>
              <p className="mt-1">
                IT load is {sizing.loadPct}% of that tier. Keep it at or under {UPS_LOAD_CEILING_PCT}%.
                {sizing.loadPct > UPS_LOAD_CEILING_PCT
                  ? " This selection is over the ceiling — step up a tier or drop load."
                  : ""}{" "}
                Estimated runtime {runtimeText} on {batteryText}.
              </p>
            </div>
          ) : null}

          <Banner>{upsGuidance()}</Banner>
        </div>
      </div>
      </div>

      <UpsPrint
        devices={devices}
        mode={mode}
        powerFactorLabel={powerFactorLabel}
        marginLabel={marginLabel}
        efficiency={efficiency}
        batteryWh={batteryWh}
        targetMinutes={targetMinutes}
        sizing={sizing}
        runtimeText={runtimeText}
        batteryText={batteryText}
      />
    </div>
  );
}

function UpsPrint({
  devices,
  mode,
  powerFactorLabel,
  marginLabel,
  efficiency,
  batteryWh,
  targetMinutes,
  sizing,
  runtimeText,
  batteryText,
}: {
  devices: DeviceRow[];
  mode: UpsMode;
  powerFactorLabel: string;
  marginLabel: string;
  efficiency: string;
  batteryWh: string;
  targetMinutes: string;
  sizing: UpsSizing;
  runtimeText: string;
  batteryText: string;
}) {
  return (
    <ToolPrint name="UPS" tone={sizing.status.tone} label={sizing.status.label}>
      <ToolPrintSection title={`Devices (${devices.length})`}>
        {devices.length === 0 ? (
          <p>No devices.</p>
        ) : (
          <ul>
            {devices.map((device) => {
              const watts = parseUpsNumber(device.watts);
              const qty = parseUpsNumber(device.qty);
              return (
                <li key={device.id}>
                  {device.label.trim() || "Device"} — {formatWatts(watts)} × {qty} ={" "}
                  {formatWatts(watts * qty)}
                </li>
              );
            })}
          </ul>
        )}
      </ToolPrintSection>

      <ToolPrintSection title="Configuration">
        <p>Power factor {powerFactorLabel}</p>
        <p>Safety margin {marginLabel}</p>
        <p>UPS efficiency {efficiency.trim() || "0"}%</p>
        <p>
          {mode === "battery"
            ? "Direction: battery watt-hours → runtime"
            : "Direction: target runtime → battery watt-hours"}
        </p>
        {mode === "battery" ? (
          <p>Battery capacity {formatWh(parseUpsNumber(batteryWh))}</p>
        ) : (
          <p>Target runtime {targetMinutes.trim() || "0"} min</p>
        )}
      </ToolPrintSection>

      <ToolPrintSection title="Sizing">
        <p>Total IT load {formatWatts(sizing.totalW)}</p>
        <p>Apparent power {formatVa(sizing.apparentVa)}</p>
        <p>With margin {formatVa(sizing.recommendedVa)}</p>
        <p>
          UPS tier {sizing.totalW > 0 ? formatVa(sizing.tierVa) : "—"}
          {sizing.totalW > 0 && !sizing.tierInCatalog ? " (above catalog)" : ""}
        </p>
        <p>Load of tier {sizing.totalW > 0 ? `${sizing.loadPct}%` : "—"}</p>
        <p>Ceiling {UPS_LOAD_CEILING_PCT}%</p>
        <p>Estimated runtime {runtimeText}</p>
        <p>Battery {batteryText}</p>
        {sizing.totalW > 0 ? (
          <p>
            Select a {formatVa(sizing.tierVa)} UPS. IT load is {sizing.loadPct}% of that tier. Keep
            it at or under {UPS_LOAD_CEILING_PCT}%.
            {sizing.loadPct > UPS_LOAD_CEILING_PCT
              ? " This selection is over the ceiling — step up a tier or drop load."
              : ""}{" "}
            Estimated runtime {runtimeText} on {batteryText}.
          </p>
        ) : null}
      </ToolPrintSection>

      <ToolPrintSection title="Guidance">
        <p>{upsGuidance()}</p>
      </ToolPrintSection>
    </ToolPrint>
  );
}

function ModeButton({
  pressed,
  onClick,
  title,
  detail,
}: {
  pressed: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-sm border px-3 py-2 text-left transition",
        pressed ? "border-ink bg-ink text-paper" : "border-rule bg-white text-ink hover:border-ink",
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className={cn("mt-0.5 block text-xs", pressed ? "text-paper/70" : "text-ink-soft")}>{detail}</span>
    </button>
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

function Metric({
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
          <span className="mt-0.5 block font-sans text-xs normal-case tracking-normal text-paper/70">{sub}</span>
        ) : null}
      </p>
      <p
        className={cn(
          "min-w-0 break-all text-right font-mono",
          accent ? "text-2xl text-paper" : "text-base text-paper/80",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <input
        className={cn(fieldControlClass, "font-mono")}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: string;
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
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
