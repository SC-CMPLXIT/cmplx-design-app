import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { TECHNOLOGY_SYSTEMS } from "@/lib/systems";
import { BOM_UNITS } from "@/lib/bom";
import { parseAreaSf } from "@/lib/proposal-fee";
import {
  assumptionsFrom,
  buildProposalDocument,
  hardwareSplit,
  laborSplit,
  proposalIssues,
} from "@/lib/proposal-document";
import { downloadProposalDocx } from "@/lib/proposal-docx";
import {
  clausesFor,
  scopeBlocksFor,
  suggestedScopeKeys,
} from "@/lib/proposal-library";
import { blankProposalLine, mergeBomIntoLines } from "@/lib/proposal-draft";
import { PROPOSAL_KINDS, PROPOSAL_PHASES, type Project, type ProjectProposal, type ProposalKind, type ProposalLine, type ProposalPhase } from "@/lib/types";
import { ProposalBody, ProposalPreview } from "./ProposalPreview";
import { Button, ErrorText, Field, PageHeader, fieldControlClass } from "./ui";

const PHASE_LABEL: Record<ProposalPhase, string> = {
  procurement: "Procurement",
  installation: "Installation",
  commissioning: "Commissioning",
};

function isKind(value: string | undefined): value is ProposalKind {
  return PROPOSAL_KINDS.includes(value as ProposalKind);
}

function toggleKey(keys: string[], key: string, on: boolean) {
  if (on) return keys.includes(key) ? keys : [...keys, key];
  return keys.filter((item) => item !== key);
}

function numberOr(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ProposalEditor() {
  const { projectId, kind: kindParam } = useParams();
  const kind = isKind(kindParam) ? kindParam : null;
  const [project, setProject] = useState<Project | null>(null);
  const [proposal, setProposal] = useState<ProjectProposal | null>(null);
  const [lines, setLines] = useState<ProposalLine[]>([]);
  const [area, setArea] = useState("");
  const [inScope, setInScope] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !kind) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [loadedProject, bundle, scope] = await Promise.all([
          api.getProject(projectId),
          api.getProposal(projectId, kind),
          api.getKickoff(projectId),
        ]);
        if (cancelled) return;
        if (!loadedProject) {
          setProject(null);
          setError("Project not found.");
          return;
        }
        setProject(loadedProject);
        setProposal(bundle.proposal);
        setLines(bundle.lines);
        setArea(loadedProject.area_sf ? String(loadedProject.area_sf) : "");
        setInScope(scope.scope.filter((row) => row.in_scope).map((row) => row.system_key));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the proposal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, kind]);

  const previewProject = useMemo(() => {
    if (!project) return null;
    let areaSf: number | null = project.area_sf ?? null;
    try {
      areaSf = parseAreaSf(area);
    } catch {
      areaSf = project.area_sf ?? null;
    }
    return { ...project, area_sf: areaSf };
  }, [project, area]);

  const document = useMemo(() => {
    if (!previewProject || !proposal) return null;
    return buildProposalDocument(previewProject, proposal, lines);
  }, [previewProject, proposal, lines]);

  if (!kind) return <Navigate to="/projects" replace />;

  function patch(partial: Partial<ProjectProposal>) {
    setProposal((current) => (current ? { ...current, ...partial } : current));
  }

  function patchLine(id: string, partial: Partial<ProposalLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...partial } : line)));
  }

  async function onSave() {
    if (!project || !proposal || !projectId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const areaSf = parseAreaSf(area);
      const issues = proposalIssues(proposal);
      if (issues.length) throw new Error(issues[0]);
      const savedProject =
        areaSf !== (project.area_sf ?? null)
          ? await api.updateProject(project.id, { area_sf: areaSf })
          : project;
      const saved = await api.saveProposal(projectId, proposal, lines);
      setProject(savedProject);
      setProposal(saved.proposal);
      setLines(saved.lines);
      setNotice("Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the proposal.");
    } finally {
      setBusy(false);
    }
  }

  async function onRefreshBom() {
    if (!projectId || !proposal) return;
    setBusy(true);
    setError(null);
    try {
      const [bom, spaces] = await Promise.all([
        api.listBomItems(projectId),
        api.getSpaceBundle(projectId),
      ]);
      const names = new Map(spaces.spaces.map((space) => [space.id, space.name]));
      setLines(mergeBomIntoLines(proposal.id, lines, bom, names));
      setNotice("Copied the bill of materials. Unit MSRP was left as you entered it. Save the draft to keep the lines.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the bill of materials.");
    } finally {
      setBusy(false);
    }
  }

  const otherKind: ProposalKind = kind === "design" ? "implementation" : "design";
  const scopeBlocks = scopeBlocksFor(kind);
  const systemNames = new Map(TECHNOLOGY_SYSTEMS.map((system) => [system.key, system.name]));

  return (
    <div>
      <div className="no-print">
        <PageHeader
          eyebrow={kind === "design" ? "Design proposal" : "Implementation proposal"}
          title={project?.name ?? "Proposal"}
          description="A stored draft. Print or download DOCX uses the sections below. It is subject to the Master Subcontractor Agreement and is not an executed contract."
          actions={
            <>
              <Link
                to={`/projects/${projectId}`}
                className="inline-flex items-center rounded-sm border border-rule bg-white px-3.5 py-2 text-sm"
              >
                Project
              </Link>
              <Link
                to={`/projects/${projectId}/proposals/${otherKind}`}
                className="inline-flex items-center rounded-sm border border-rule bg-white px-3.5 py-2 text-sm"
              >
                {otherKind === "design" ? "Design proposal" : "Implementation proposal"}
              </Link>
              <Button type="button" variant="ghost" disabled={!document || busy} onClick={() => window.print()}>
                Print / PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!document || busy}
                onClick={() => {
                  if (!document) return;
                  void downloadProposalDocx(document).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Could not download the DOCX.");
                  });
                }}
              >
                Download DOCX
              </Button>
            </>
          }
        />

        {loading ? <p className="font-serif text-2xl text-ink-soft">Loading proposal_</p> : null}

        {proposal && project ? (
          <div className="space-y-8">
            <section className="rounded-sm border border-rule bg-white p-5">
              <h2 className="font-serif text-3xl">Project statement</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <input
                    className={fieldControlClass}
                    value={proposal.title}
                    maxLength={200}
                    onChange={(event) => patch({ title: event.target.value })}
                  />
                </Field>
                <Field label="Subtitle">
                  <input
                    className={fieldControlClass}
                    value={proposal.subtitle}
                    maxLength={200}
                    onChange={(event) => patch({ subtitle: event.target.value })}
                  />
                </Field>
                <Field label="Client" hint="Left blank until you type it. Not taken from a template.">
                  <input
                    className={fieldControlClass}
                    value={proposal.client_name}
                    maxLength={160}
                    onChange={(event) => patch({ client_name: event.target.value })}
                  />
                </Field>
                <Field label="Issue date">
                  <input
                    className={fieldControlClass}
                    type="date"
                    value={proposal.issued_on ?? ""}
                    onChange={(event) => patch({ issued_on: event.target.value || null })}
                  />
                </Field>
                <Field label="Gross area (sf)" hint="Stored on the project. Hours use this divided by 1,000.">
                  <input
                    className={fieldControlClass}
                    inputMode="numeric"
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Statement" className="mt-4">
                <textarea
                  className={`${fieldControlClass} min-h-32`}
                  value={proposal.project_statement}
                  maxLength={8000}
                  onChange={(event) => patch({ project_statement: event.target.value })}
                />
              </Field>
            </section>

            <section className="rounded-sm border border-rule bg-white p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-serif text-3xl">Scope</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
                    Blocks turn on when a linked system is in scope. Hospitality lists stay off until
                    you include them. Suggest again replaces the ticks from the current system checklist.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => patch({ scope_keys: suggestedScopeKeys(kind, new Set(inScope)) })}
                >
                  Suggest again
                </Button>
              </div>
              <ul className="mt-4 space-y-3">
                {scopeBlocks.map((block) => {
                  const hits = block.systemKeys
                    .filter((key) => inScope.includes(key))
                    .map((key) => systemNames.get(key) ?? key);
                  return (
                    <li key={block.key} className="rounded-sm border border-rule p-3">
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={proposal.scope_keys.includes(block.key)}
                          onChange={(event) =>
                            patch({ scope_keys: toggleKey(proposal.scope_keys, block.key, event.target.checked) })
                          }
                        />
                        <span>
                          <span className="font-medium">{block.title}</span>
                          {hits.length ? (
                            <span className="mt-1 block text-ink-soft">Suggested from {hits.join(", ")}.</span>
                          ) : (
                            <span className="mt-1 block text-ink-soft">Not tied to a system on this checklist.</span>
                          )}
                        </span>
                      </label>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-ink-soft">Read</summary>
                        <div className="mt-2">
                          <ProposalBody body={block.body} />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
              <Field label="Additional scope" className="mt-4">
                <textarea
                  className={`${fieldControlClass} min-h-24`}
                  value={proposal.scope_note}
                  maxLength={8000}
                  onChange={(event) => patch({ scope_note: event.target.value })}
                />
              </Field>
            </section>

            {kind === "design" ? (
              <DesignFeeFields proposal={proposal} onChange={patch} />
            ) : (
              <ImplementationFee
                proposal={proposal}
                lines={lines}
                busy={busy}
                onChange={patch}
                onPatchLine={patchLine}
                onLines={setLines}
                onRefresh={() => void onRefreshBom()}
              />
            )}

            <section className="rounded-sm border border-rule bg-white p-5">
              <h2 className="font-serif text-3xl">Agreement</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
                The agreement text on the draft is fixed: subject to the CMPLX iT Master Subcontractor
                Agreement, 15-day payment when CMPLX iT is the subcontractor, background intellectual
                property retained, and deliverables transferring on full payment. Add a note if this
                project needs one. Do not treat the draft as signed.
              </p>
              <Field label="Note" className="mt-4">
                <textarea
                  className={`${fieldControlClass} min-h-24`}
                  value={proposal.agreement_note}
                  maxLength={4000}
                  onChange={(event) => patch({ agreement_note: event.target.value })}
                />
              </Field>
            </section>

            <ClausePicker
              title="Assumptions"
              blocks={clausesFor("assumption")}
              selected={proposal.assumption_keys}
              onChange={(assumption_keys) => patch({ assumption_keys })}
            />
            <ClausePicker
              title="Exclusions"
              blocks={clausesFor("exclusion")}
              selected={proposal.exclusion_keys}
              onChange={(exclusion_keys) => patch({ exclusion_keys })}
            />
            <section className="rounded-sm border border-rule bg-white p-5">
              <h2 className="font-serif text-3xl">Terms</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
                {kind === "design"
                  ? "Consulting invoices are net 30. Late amounts accrue 1.5% per month. Reimbursables are cost plus 10%. Those three lines are always on the draft."
                  : "Hardware and labor milestones below are the payment terms. Late amounts accrue 1.5% per month. Reimbursables are cost plus 10%."}
              </p>
              <ul className="mt-4 space-y-3">
                {clausesFor("term").map((block) => (
                  <li key={block.key} className="rounded-sm border border-rule p-3">
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={proposal.term_keys.includes(block.key)}
                        onChange={(event) =>
                          patch({ term_keys: toggleKey(proposal.term_keys, block.key, event.target.checked) })
                        }
                      />
                      <span className="font-medium">{block.title}</span>
                    </label>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-ink-soft">Read</summary>
                      <div className="mt-2">
                        <ProposalBody body={block.body} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={busy} onClick={() => void onSave()}>
                Save draft
              </Button>
              {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
              <ErrorText>{error}</ErrorText>
            </div>
          </div>
        ) : (
          <ErrorText>{error}</ErrorText>
        )}
      </div>

      {document ? (
        <div className="mt-10">
          <ProposalPreview doc={document} />
        </div>
      ) : null}
    </div>
  );
}

function DesignFeeFields({
  proposal,
  onChange,
}: {
  proposal: ProjectProposal;
  onChange: (partial: Partial<ProjectProposal>) => void;
}) {
  const fields: Array<{ key: keyof ProjectProposal; label: string; step: string }> = [
    { key: "design_rate_cents", label: "Design $ / hour", step: "1" },
    { key: "drafting_rate_cents", label: "Drafting $ / hour", step: "1" },
    { key: "ca_day_rate_cents", label: "CA site day $", step: "1" },
    { key: "bod_design_hours_per_1000", label: "BoD design h / 1,000 sf", step: "0.5" },
    { key: "bod_drafting_hours_per_1000", label: "BoD drafting h / 1,000 sf", step: "0.5" },
    { key: "dd_design_hours_per_1000", label: "DD–CD design h / 1,000 sf", step: "0.5" },
    { key: "dd_drafting_hours_per_1000", label: "DD–CD drafting h / 1,000 sf", step: "0.5" },
    { key: "ca_design_hours_per_1000", label: "CA design h / 1,000 sf", step: "0.5" },
    { key: "ca_drafting_hours_per_1000", label: "CA drafting h / 1,000 sf", step: "0.5" },
    { key: "ca_site_days", label: "CA site days (count)", step: "0.5" },
  ];
  return (
    <section className="rounded-sm border border-rule bg-white p-5">
      <h2 className="font-serif text-3xl">Service fee</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">
        Hours for a phase equal gross area divided by 1,000, times the hours per 1,000 sf in that
        box. Dollars are those hours times the rate, rounded to the cent. Site days are a count for
        the whole project, times the site-day rate. Defaults are 6 and 2 hours (Basis of Design),
        10 and 8 (DD–CD), 2 and 1 plus 4 site days (CA), at $200, $110, and $1,200.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => {
          const raw = proposal[field.key];
          const money = field.key.endsWith("_cents");
          const shown = typeof raw === "number" ? (money ? raw / 100 : raw) : "";
          return (
            <Field key={field.key} label={field.label}>
              <input
                className={fieldControlClass}
                type="number"
                min={0}
                step={field.step}
                value={shown}
                onChange={(event) => {
                  const parsed = numberOr(event.target.value, 0);
                  const stored = money ? Math.round(parsed * 100) : parsed;
                  onChange({ [field.key]: stored });
                }}
              />
            </Field>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        Rates in effect: design {assumptionsFrom(proposal).designRateCents / 100}, drafting{" "}
        {assumptionsFrom(proposal).draftingRateCents / 100}, site day{" "}
        {assumptionsFrom(proposal).caDayRateCents / 100}.
      </p>
    </section>
  );
}

function ImplementationFee({
  proposal,
  lines,
  busy,
  onChange,
  onPatchLine,
  onLines,
  onRefresh,
}: {
  proposal: ProjectProposal;
  lines: ProposalLine[];
  busy: boolean;
  onChange: (partial: Partial<ProjectProposal>) => void;
  onPatchLine: (id: string, partial: Partial<ProposalLine>) => void;
  onLines: (lines: ProposalLine[]) => void;
  onRefresh: () => void;
}) {
  const hardware = hardwareSplit(proposal);
  const labor = laborSplit(proposal);
  const hardwareSum = Math.round((hardware.depositPct + hardware.deliveryPct + hardware.substantialPct) * 100) / 100;
  const laborSum = Math.round((labor.depositPct + labor.deliveryPct + labor.substantialPct) * 100) / 100;
  const issues = proposalIssues(proposal);
  return (
    <section className="rounded-sm border border-rule bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-3xl">Service fee</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-soft">
            Lines come from the bill of materials. Unit MSRP stays blank until you type it. Extended
            price is quantity times that unit price. Labor is an amount you enter. Hardware defaults
            are 90% deposit, 8% delivery, and 2% substantial completion. Labor defaults are 0%, 75%,
            and 25%. Each column has to add to 100%.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onRefresh}>
            Pull bill of materials
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              onLines([
                ...lines,
                blankProposalLine(proposal.id, lines.reduce((max, line) => Math.max(max, line.sort_order), 0) + 1),
              ])
            }
          >
            Add line
          </Button>
        </div>
      </div>
      <Field label="Labor total ($)" className="mt-4 max-w-xs" hint="Not calculated from hardware or area.">
        <input
          className={fieldControlClass}
          type="number"
          min={0}
          step="0.01"
          value={proposal.labor_cents / 100}
          onChange={(event) =>
            onChange({ labor_cents: Math.round(numberOr(event.target.value, 0) * 100) })
          }
        />
      </Field>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PercentTrio
          title="Hardware"
          split={hardware}
          sum={hardwareSum}
          onChange={(next) =>
            onChange({
              hardware_deposit_pct: next.depositPct,
              hardware_delivery_pct: next.deliveryPct,
              hardware_substantial_pct: next.substantialPct,
            })
          }
        />
        <PercentTrio
          title="Labor"
          split={labor}
          sum={laborSum}
          onChange={(next) =>
            onChange({
              labor_deposit_pct: next.depositPct,
              labor_delivery_pct: next.deliveryPct,
              labor_substantial_pct: next.substantialPct,
            })
          }
        />
      </div>
      {issues.length ? <p className="mt-3 text-sm text-rose-800">{issues[0]}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink">
              <th className="py-2 pr-2 font-medium">System</th>
              <th className="py-2 pr-2 font-medium">Space</th>
              <th className="py-2 pr-2 font-medium">Phase</th>
              <th className="py-2 pr-2 font-medium">Item</th>
              <th className="py-2 pr-2 font-medium">Qty</th>
              <th className="py-2 pr-2 font-medium">Unit</th>
              <th className="py-2 pr-2 font-medium">Unit MSRP</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-rule align-top">
                <td className="py-2 pr-2">
                  <select
                    className={fieldControlClass}
                    value={line.system_key}
                    onChange={(event) => onPatchLine(line.id, { system_key: event.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {TECHNOLOGY_SYSTEMS.map((system) => (
                      <option key={system.key} value={system.key}>
                        {system.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    className={fieldControlClass}
                    value={line.space_label}
                    onChange={(event) => onPatchLine(line.id, { space_label: event.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    className={fieldControlClass}
                    value={line.phase}
                    onChange={(event) =>
                      onPatchLine(line.id, { phase: event.target.value as ProposalPhase })
                    }
                  >
                    {PROPOSAL_PHASES.map((phase) => (
                      <option key={phase} value={phase}>
                        {PHASE_LABEL[phase]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    className={fieldControlClass}
                    value={line.name}
                    onChange={(event) => onPatchLine(line.id, { name: event.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className={fieldControlClass}
                    type="number"
                    min={0}
                    step="0.001"
                    value={line.quantity}
                    onChange={(event) =>
                      onPatchLine(line.id, { quantity: numberOr(event.target.value, line.quantity) })
                    }
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className={fieldControlClass}
                    list="proposal-units"
                    value={line.unit}
                    onChange={(event) => onPatchLine(line.id, { unit: event.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className={fieldControlClass}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Not set"
                    value={line.unit_msrp_cents == null ? "" : line.unit_msrp_cents / 100}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      onPatchLine(line.id, {
                        unit_msrp_cents: raw === "" ? null : Math.round(numberOr(raw, 0) * 100),
                      });
                    }}
                  />
                </td>
                <td className="py-2">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => onLines(lines.filter((item) => item.id !== line.id))}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="proposal-units">
          {BOM_UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </div>
    </section>
  );
}

function PercentTrio({
  title,
  split,
  sum,
  onChange,
}: {
  title: string;
  split: { depositPct: number; deliveryPct: number; substantialPct: number };
  sum: number;
  onChange: (split: { depositPct: number; deliveryPct: number; substantialPct: number }) => void;
}) {
  const fields = [
    ["depositPct", "Ordering deposit %"],
    ["deliveryPct", "Delivery %"],
    ["substantialPct", "Substantial completion %"],
  ] as const;
  return (
    <fieldset className="rounded-sm border border-rule p-3">
      <legend className="px-1 text-sm font-medium">
        {title} · {sum}%
      </legend>
      <div className="mt-2 grid gap-3">
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              className={fieldControlClass}
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={split[key]}
              onChange={(event) => onChange({ ...split, [key]: numberOr(event.target.value, 0) })}
            />
          </Field>
        ))}
      </div>
    </fieldset>
  );
}

function ClausePicker({
  title,
  blocks,
  selected,
  onChange,
}: {
  title: string;
  blocks: Array<{ key: string; title: string; body: string }>;
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  return (
    <section className="rounded-sm border border-rule bg-white p-5">
      <h2 className="font-serif text-3xl">{title}</h2>
      <ul className="mt-4 space-y-3">
        {blocks.map((block) => (
          <li key={block.key} className="rounded-sm border border-rule p-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(block.key)}
                onChange={(event) => onChange(toggleKey(selected, block.key, event.target.checked))}
              />
              <span className="font-medium">{block.title}</span>
            </label>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-ink-soft">Read</summary>
              <div className="mt-2">
                <ProposalBody body={block.body} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
