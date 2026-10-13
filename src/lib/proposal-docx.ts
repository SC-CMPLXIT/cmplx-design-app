import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { formatHours, formatPercent, formatUsd } from "./proposal-fee";
import { proposalTextBlocks, type ProposalTextBlock } from "./proposal-library";
import type { ProposalDocument } from "./proposal-document";

const INK = "0C0C0B";
const INK_SOFT = "3C3832";
const RULE = "CFC6B6";

function run(
  text: string,
  options: { bold?: boolean; italics?: boolean; size?: number; color?: string; font?: string } = {},
) {
  return new TextRun({
    text,
    font: options.font ?? "Calibri",
    size: options.size ?? 21,
    bold: options.bold,
    italics: options.italics,
    color: options.color ?? INK,
  });
}

function paragraph(text: string, spacingAfter = 120): Paragraph {
  return new Paragraph({
    spacing: { after: spacingAfter },
    children: [run(text)],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 1 } },
    spacing: { before: 280, after: 120 },
    children: [run(text, { bold: true, font: "Georgia", size: 26 })],
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 160, after: 80 },
    children: [run(text, { bold: true, font: "Georgia", size: 22 })],
  });
}

function blockParagraph(block: ProposalTextBlock): Paragraph {
  if (block.kind === "heading") {
    return new Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 60 },
      children: [run(block.text, { bold: true, size: block.level <= 2 ? 22 : 21 })],
    });
  }
  const indent = block.kind === "bullet" ? 360 + block.level * 240 : 0;
  const text = block.kind === "bullet" ? `•  ${block.text}` : block.text;
  return new Paragraph({
    spacing: { after: 60 },
    indent: indent ? { left: indent } : undefined,
    children: [run(text)],
  });
}

function fromBody(body: string): Paragraph[] {
  return proposalTextBlocks(body).map((block) => blockParagraph(block));
}

function cell(text: string, bold: boolean, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [new Paragraph({ children: [run(text, { bold, size: 16 })] })],
  });
}

function table(rows: string[][], widths: number[]): Table {
  return new Table({
    width: { size: 10080, type: WidthType.DXA },
    rows: rows.map(
      (row, index) =>
        new TableRow({
          tableHeader: index === 0,
          cantSplit: true,
          children: row.map((value, cellIndex) =>
            cell(value, index === 0, widths[cellIndex] ?? 1400),
          ),
        }),
    ),
  });
}

function signature(doc: ProposalDocument): Array<Paragraph | Table> {
  const client = doc.clientName || "Client";
  return [
    heading("Agreement"),
    ...doc.agreement.map((text) => paragraph(text)),
    ...(doc.agreementNote ? [paragraph(doc.agreementNote)] : []),
    paragraph(
      "By signing below, both parties agree to the scope, deliverables, and fees in this proposal, subject to the CMPLX iT Master Subcontractor Agreement.",
    ),
    paragraph(`CMPLX iT                                                          ${client}`),
    paragraph("Name:                                    Name:"),
    paragraph("Title:                                      Title:"),
    paragraph("Date:                                      Date:"),
    paragraph("Signature:                              Signature:"),
  ];
}

export function buildProposalDocx(doc: ProposalDocument): Document {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { after: 40 },
      children: [run(doc.title, { bold: true, font: "Georgia", size: 36 })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [run(doc.subtitle, { font: "Georgia", size: 26 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        run(
          [doc.clientName, doc.issuedLabel !== "—" ? doc.issuedLabel : ""].filter(Boolean).join("  ·  ") ||
            "Draft",
          { size: 18, italics: true, color: INK_SOFT },
        ),
      ],
    }),
    heading("Project statement"),
    paragraph(doc.statement || "Project statement to be written."),
    heading("Scope"),
    paragraph("The terms of this proposal are subject to the CMPLX iT Master Subcontractor Agreement."),
  ];

  if (doc.scopeBlocks.length === 0 && !doc.scopeNote) {
    children.push(paragraph("No scope blocks are included."));
  }
  for (const block of doc.scopeBlocks) {
    children.push(subheading(block.title));
    children.push(...fromBody(block.body));
  }
  if (doc.scopeNote) {
    children.push(subheading("Additional scope"));
    children.push(paragraph(doc.scopeNote));
  }

  children.push(heading("Service fee"));
  children.push(paragraph(doc.feeNote));
  if (doc.kind === "design" && doc.design && doc.assumptions) {
    children.push(
      paragraph(
        `Rates on this draft: design ${formatUsd(doc.assumptions.designRateCents)} per hour, drafting ${formatUsd(doc.assumptions.draftingRateCents)} per hour, construction administration ${formatUsd(doc.assumptions.caDayRateCents)} per site day.`,
      ),
    );
    children.push(
      paragraph(
        doc.design.areaUnits == null
          ? "Gross area is not set. Hour lines stay blank until it is."
          : `Gross area ${formatHours(doc.design.areaSf)} square feet. Each phase's hours equal that area divided by 1,000, times the hours per 1,000 sf shown for the phase. Site days are a count. Dollars round to the cent. Nothing else is applied.`,
        80,
      ),
    );
    children.push(
      table(
        [
          ["Phase", "Design h / 1,000 sf", "Drafting h / 1,000 sf", "Design h", "Drafting h", "Site days", "Amount"],
          ...doc.design.phases.map((phase) => [
            phase.label,
            formatHours(phase.designHoursPer1000),
            formatHours(phase.draftingHoursPer1000),
            formatHours(phase.designHours),
            formatHours(phase.draftingHours),
            phase.key === "ca" ? formatHours(phase.siteDays) : "—",
            formatUsd(phase.totalCents),
          ]),
          ["Total", "", "", "", "", "", formatUsd(doc.design.totalCents)],
        ],
        [1700, 1450, 1550, 1100, 1200, 1100, 1980],
      ),
    );
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  } else {
    if (doc.lines.length === 0) {
      children.push(
        paragraph("No fee lines yet. Pull the bill of materials or add a line, then enter unit MSRP."),
      );
    } else {
      const rows: string[][] = [["System", "Space", "Phase", "Item", "Qty", "Unit MSRP", "Extended"]];
      for (const line of doc.lines) {
        rows.push([
          line.systemName,
          line.spaceLabel,
          line.phaseLabel,
          line.name,
          line.quantityLabel,
          line.unitMsrpLabel,
          line.extendedLabel,
        ]);
      }
      children.push(table(rows, [1450, 1350, 1400, 2300, 1000, 1200, 1380]));
      children.push(new Paragraph({ spacing: { before: 80 }, children: [] }));
    }
    children.push(
      paragraph(
        `Hardware total ${formatUsd(doc.hardwareCents)} from lines with a unit MSRP. ${doc.unpricedCount} ${doc.unpricedCount === 1 ? "line has" : "lines have"} no MSRP and ${doc.unpricedCount === 1 ? "is" : "are"} left out of the total. Labor total ${formatUsd(doc.laborCents)}, entered on the draft and not calculated from the hardware.`,
      ),
    );
    children.push(
      table(
        [
          ["Milestone", "Hardware", "Labor"],
          [
            "Ordering deposit",
            `${formatPercent(doc.hardwareSplit.depositPct)}%  ${formatUsd(doc.hardwareAmounts.depositCents)}`,
            `${formatPercent(doc.laborSplit.depositPct)}%  ${formatUsd(doc.laborAmounts.depositCents)}`,
          ],
          [
            "Delivery",
            `${formatPercent(doc.hardwareSplit.deliveryPct)}%  ${formatUsd(doc.hardwareAmounts.deliveryCents)}`,
            `${formatPercent(doc.laborSplit.deliveryPct)}%  ${formatUsd(doc.laborAmounts.deliveryCents)}`,
          ],
          [
            "Substantial completion",
            `${formatPercent(doc.hardwareSplit.substantialPct)}%  ${formatUsd(doc.hardwareAmounts.substantialCents)}`,
            `${formatPercent(doc.laborSplit.substantialPct)}%  ${formatUsd(doc.laborAmounts.substantialCents)}`,
          ],
        ],
        [3360, 3360, 3360],
      ),
    );
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }

  children.push(...signature(doc));
  children.push(heading("Assumptions"));
  if (doc.assumptionBlocks.length === 0) children.push(paragraph("No assumption sections are included."));
  for (const block of doc.assumptionBlocks) {
    children.push(subheading(block.title));
    children.push(...fromBody(block.body));
  }
  children.push(heading("Exclusions"));
  if (doc.exclusionBlocks.length === 0) children.push(paragraph("No exclusion sections are included."));
  for (const block of doc.exclusionBlocks) {
    children.push(subheading(block.title));
    children.push(...fromBody(block.body));
  }
  children.push(heading("Terms"));
  for (const text of doc.fixedTerms) children.push(paragraph(text));
  for (const block of doc.termBlocks) {
    children.push(subheading(block.title));
    children.push(...fromBody(block.body));
  }

  return new Document({
    title: doc.title,
    creator: "CMPLX iT",
    description: `${doc.kindLabel}. Subject to the CMPLX iT Master Subcontractor Agreement. Not an executed contract.`,
    styles: {
      default: { document: { run: { font: "Calibri", size: 21 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1008, bottom: 1008, left: 1080, right: 1080, header: 576, footer: 576 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 6 } },
                spacing: { after: 80 },
                children: [
                  run("CMPLX iT", { bold: true, size: 20 }),
                  run("   ·   ", { size: 16, color: INK_SOFT }),
                  run(doc.kindLabel, { size: 16, color: INK_SOFT }),
                  run("   ·   ", { size: 16, color: INK_SOFT }),
                  run("Subject to the Master Subcontractor Agreement", {
                    italics: true,
                    size: 16,
                    color: INK_SOFT,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 6 } },
                children: [
                  run("CMPLX iT  ·  Draft proposal  ·  Page ", { size: 15, color: INK_SOFT }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Calibri",
                    size: 15,
                    color: INK_SOFT,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export function proposalDocxFilename(projectName: string, kind: ProposalDocument["kind"]): string {
  const safe = projectName.replace(/[^\w\s.—-]+/g, "").trim().slice(0, 80);
  const label = kind === "design" ? "design proposal" : "implementation proposal";
  return `${safe || "Project"} — ${label}.docx`;
}

export async function downloadProposalDocx(doc: ProposalDocument): Promise<void> {
  const blob = await Packer.toBlob(buildProposalDocx(doc));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = proposalDocxFilename(doc.projectName, doc.kind);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
