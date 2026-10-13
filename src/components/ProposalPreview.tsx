import type { ReactNode } from "react";
import { formatHours, formatPercent, formatUsd } from "@/lib/proposal-fee";
import { proposalTextBlocks } from "@/lib/proposal-library";
import { designMathCaption, type ProposalDocument } from "@/lib/proposal-document";

export function ProposalBody({ body }: { body: string }) {
  return (
    <div className="space-y-1">
      {proposalTextBlocks(body).map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h4 key={index} className="pt-2 font-serif text-lg">
              {block.text}
            </h4>
          );
        }
        if (block.kind === "bullet") {
          return (
            <p key={index} className="text-sm leading-6" style={{ paddingLeft: `${block.level + 1}rem` }}>
              • {block.text}
            </p>
          );
        }
        return (
          <p key={index} className="text-sm leading-6">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="border-b border-ink pb-1 font-serif text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6">{children}</div>
    </section>
  );
}

export function ProposalPreview({ doc }: { doc: ProposalDocument }) {
  const client = doc.clientName || "Client";
  return (
    <article className="proposal-print print-sheet rounded-sm border border-rule bg-white p-6 sm:p-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">CMPLX iT</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">{doc.title}</h1>
      <p className="mt-1 font-serif text-2xl text-ink-soft">{doc.subtitle}</p>
      <p className="mt-3 text-sm text-ink-soft">
        {[doc.clientName, doc.issuedLabel !== "—" ? doc.issuedLabel : "Draft"]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-2 text-xs text-ink-soft">
        Subject to the CMPLX iT Master Subcontractor Agreement. This draft is not an executed contract.
      </p>

      <Section title="Project statement">
        <p className="whitespace-pre-wrap">{doc.statement || "Project statement to be written."}</p>
      </Section>

      <Section title="Scope">
        <p>The terms of this proposal are subject to the CMPLX iT Master Subcontractor Agreement.</p>
        {doc.scopeBlocks.length === 0 && !doc.scopeNote ? <p>No scope blocks are included.</p> : null}
        {doc.scopeBlocks.map((block) => (
          <div key={block.key}>
            <h3 className="font-serif text-xl">{block.title}</h3>
            <ProposalBody body={block.body} />
          </div>
        ))}
        {doc.scopeNote ? (
          <div>
            <h3 className="font-serif text-xl">Additional scope</h3>
            <p className="whitespace-pre-wrap">{doc.scopeNote}</p>
          </div>
        ) : null}
      </Section>

      <Section title="Service fee">
        <p>{doc.feeNote}</p>
        {doc.kind === "design" && doc.design && doc.assumptions ? (
          <>
            <p>{designMathCaption(doc.design, doc.assumptions)}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink">
                    <th className="py-2 pr-3 font-medium">Phase</th>
                    <th className="py-2 pr-3 font-medium">Design h / 1,000 sf</th>
                    <th className="py-2 pr-3 font-medium">Drafting h / 1,000 sf</th>
                    <th className="py-2 pr-3 font-medium">Design h</th>
                    <th className="py-2 pr-3 font-medium">Drafting h</th>
                    <th className="py-2 pr-3 font-medium">Site days</th>
                    <th className="py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.design.phases.map((phase) => (
                    <tr key={phase.key} className="border-b border-rule">
                      <td className="py-2 pr-3">{phase.label}</td>
                      <td className="py-2 pr-3">{formatHours(phase.designHoursPer1000)}</td>
                      <td className="py-2 pr-3">{formatHours(phase.draftingHoursPer1000)}</td>
                      <td className="py-2 pr-3">{formatHours(phase.designHours)}</td>
                      <td className="py-2 pr-3">{formatHours(phase.draftingHours)}</td>
                      <td className="py-2 pr-3">
                        {phase.key === "ca" ? formatHours(phase.siteDays) : "—"}
                      </td>
                      <td className="py-2">{formatUsd(phase.totalCents)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 font-medium" colSpan={6}>
                      Total
                    </td>
                    <td className="py-2 font-medium">{formatUsd(doc.design.totalCents)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {doc.lines.length === 0 ? (
              <p>No fee lines yet. Pull the bill of materials or add a line, then enter unit MSRP.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink">
                      <th className="py-2 pr-3 font-medium">System</th>
                      <th className="py-2 pr-3 font-medium">Space</th>
                      <th className="py-2 pr-3 font-medium">Phase</th>
                      <th className="py-2 pr-3 font-medium">Item</th>
                      <th className="py-2 pr-3 font-medium">Qty</th>
                      <th className="py-2 pr-3 font-medium">Unit MSRP</th>
                      <th className="py-2 font-medium">Extended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.lines.map((line) => (
                      <tr key={line.id} className="border-b border-rule align-top">
                        <td className="py-2 pr-3">{line.systemName}</td>
                        <td className="py-2 pr-3">{line.spaceLabel}</td>
                        <td className="py-2 pr-3">{line.phaseLabel}</td>
                        <td className="py-2 pr-3">
                          {line.name}
                          {line.notes ? (
                            <span className="mt-1 block text-ink-soft">{line.notes}</span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3">{line.quantityLabel}</td>
                        <td className="py-2 pr-3">{line.unitMsrpLabel}</td>
                        <td className="py-2">{line.extendedLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p>
              Hardware total {formatUsd(doc.hardwareCents)} from lines with a unit MSRP.{" "}
              {doc.unpricedCount} {doc.unpricedCount === 1 ? "line has" : "lines have"} no MSRP and{" "}
              {doc.unpricedCount === 1 ? "is" : "are"} left out of the total. Labor total{" "}
              {formatUsd(doc.laborCents)}, entered on the draft and not calculated from the hardware.
              Extended price is quantity times unit MSRP. This draft does not add a markup.
            </p>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink">
                  <th className="py-2 pr-3 font-medium">Milestone</th>
                  <th className="py-2 pr-3 font-medium">Hardware</th>
                  <th className="py-2 font-medium">Labor</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-rule">
                  <td className="py-2 pr-3">Ordering deposit</td>
                  <td className="py-2 pr-3">
                    {formatPercent(doc.hardwareSplit.depositPct)}%{" "}
                    {formatUsd(doc.hardwareAmounts.depositCents)}
                  </td>
                  <td className="py-2">
                    {formatPercent(doc.laborSplit.depositPct)}% {formatUsd(doc.laborAmounts.depositCents)}
                  </td>
                </tr>
                <tr className="border-b border-rule">
                  <td className="py-2 pr-3">Delivery</td>
                  <td className="py-2 pr-3">
                    {formatPercent(doc.hardwareSplit.deliveryPct)}%{" "}
                    {formatUsd(doc.hardwareAmounts.deliveryCents)}
                  </td>
                  <td className="py-2">
                    {formatPercent(doc.laborSplit.deliveryPct)}% {formatUsd(doc.laborAmounts.deliveryCents)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Substantial completion</td>
                  <td className="py-2 pr-3">
                    {formatPercent(doc.hardwareSplit.substantialPct)}%{" "}
                    {formatUsd(doc.hardwareAmounts.substantialCents)}
                  </td>
                  <td className="py-2">
                    {formatPercent(doc.laborSplit.substantialPct)}%{" "}
                    {formatUsd(doc.laborAmounts.substantialCents)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-ink-soft">
              Substantial completion is the remainder so each column adds up to its total.
            </p>
          </>
        )}
      </Section>

      <Section title="Agreement">
        {doc.agreement.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {doc.agreementNote ? <p className="whitespace-pre-wrap">{doc.agreementNote}</p> : null}
        <p>
          By signing below, both parties agree to the scope, deliverables, and fees in this proposal,
          subject to the CMPLX iT Master Subcontractor Agreement.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="font-medium">CMPLX iT</p>
            <p className="mt-4">Name:</p>
            <p className="mt-3">Title:</p>
            <p className="mt-3">Date:</p>
            <p className="mt-3">Signature:</p>
          </div>
          <div>
            <p className="font-medium">{client}</p>
            <p className="mt-4">Name:</p>
            <p className="mt-3">Title:</p>
            <p className="mt-3">Date:</p>
            <p className="mt-3">Signature:</p>
          </div>
        </div>
      </Section>

      <Section title="Assumptions">
        {doc.assumptionBlocks.length === 0 ? <p>No assumption sections are included.</p> : null}
        {doc.assumptionBlocks.map((block) => (
          <div key={block.key}>
            <h3 className="font-serif text-xl">{block.title}</h3>
            <ProposalBody body={block.body} />
          </div>
        ))}
      </Section>

      <Section title="Exclusions">
        {doc.exclusionBlocks.length === 0 ? <p>No exclusion sections are included.</p> : null}
        {doc.exclusionBlocks.map((block) => (
          <div key={block.key}>
            <h3 className="font-serif text-xl">{block.title}</h3>
            <ProposalBody body={block.body} />
          </div>
        ))}
      </Section>

      <Section title="Terms">
        {doc.fixedTerms.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {doc.termBlocks.map((block) => (
          <div key={block.key}>
            <h3 className="font-serif text-xl">{block.title}</h3>
            <ProposalBody body={block.body} />
          </div>
        ))}
      </Section>
    </article>
  );
}
