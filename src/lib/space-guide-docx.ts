import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from "docx";
import { fetchGuideImage, type GuideRaster } from "./space-guide-media";
import {
  answeredGuideSections,
  openGuideQuestions,
  spaceGuideDocxFilename,
  summaryRows,
  type GuideGap,
  type GuideQuestion,
  type GuideSpace,
  type SpaceGuideModel,
} from "./space-guide";

const NAVY = "1F2A44";
const GREY = "666666";
const RED = "B03030";
const RULE = "C5CEDD";
const SHADE = "E8ECF3";
const CONTENT_DXA = 10224;
const LABEL_DXA = 2448;
const IMAGE_DXA = 3672;

const thin = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: RULE,
} as const;

const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };

function run(
  text: string,
  options: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {},
) {
  return new TextRun({
    text,
    font: "Calibri",
    size: options.size ?? 19,
    bold: options.bold,
    italics: options.italics,
    color: options.color ?? "222222",
  });
}

function answerBodyParagraphs(body: string): Paragraph[] {
  const empty = body.trim().length === 0;
  const text = empty ? "No answer yet." : body.trim();
  const lines = text.split("\n");
  return lines.map(
    (line, index) =>
      new Paragraph({
        spacing: { after: index === lines.length - 1 ? 60 : 20 },
        children: [
          run(line.length > 0 ? line : " ", {
            size: 19,
            italics: empty,
            color: empty ? GREY : "222222",
          }),
        ],
      }),
  );
}

function heading(text: string, level: 1 | 2, pageBreakBefore = false): Paragraph {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    keepNext: true,
    pageBreakBefore,
    border:
      level === 1
        ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 1 } }
        : undefined,
    spacing: { before: level === 1 ? 200 : 120, after: 60 },
    children: [run(text, { bold: true, size: level === 1 ? 25 : 21, color: NAVY })],
  });
}

function fact(label: string, value: string): Paragraph[] {
  const lines = value.split("\n");
  return lines.map(
    (line, index) =>
      new Paragraph({
        spacing: { after: index === lines.length - 1 ? 60 : 20 },
        children: [
          ...(index === 0 ? [run(`${label}: `, { bold: true, size: 18 })] : []),
          run(line.length > 0 ? line : " ", { size: 18 }),
        ],
      }),
  );
}

function statusColor(status: GuideQuestion["status"]): string {
  if (status === "open") return RED;
  if (status === "locked") return GREY;
  return NAVY;
}

function questionBlocks(question: GuideQuestion): Paragraph[] {
  return [
    new Paragraph({
      keepNext: true,
      keepLines: true,
      spacing: { before: 80, after: 20 },
      children: [run(question.prompt, { bold: true, size: 19 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { after: 20 },
      children: [run(question.statusLabel, { bold: true, size: 16, color: statusColor(question.status) })],
    }),
    ...answerBodyParagraphs(question.body),
  ];
}

function summaryTable(model: SpaceGuideModel): Table {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    columnWidths: [LABEL_DXA, CONTENT_DXA - LABEL_DXA],
    rows: summaryRows(model).map(
      ([label, value]) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: LABEL_DXA, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: SHADE },
              borders: cellBorders,
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: [new Paragraph({ children: [run(label, { bold: true, size: 18 })] })],
            }),
            new TableCell({
              width: { size: CONTENT_DXA - LABEL_DXA, type: WidthType.DXA },
              borders: cellBorders,
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: value.split("\n").map(
                (line, index, all) =>
                  new Paragraph({
                    spacing: { after: index === all.length - 1 ? 0 : 20 },
                    children: [run(line || " ", { size: 18 })],
                  }),
              ),
            }),
          ],
        }),
    ),
  });
}

function spaceTable(space: GuideSpace, image: GuideRaster | null): Table | Paragraph[] {
  const copy = [
    ...fact("Plan shows", space.planShows),
    ...fact("Intended use", space.intendedUse),
    ...fact("Occupancy", space.occupancy),
    ...(space.notes ? fact("Notes", space.notes) : []),
  ];
  if (!space.image) {
    return [
      ...copy,
      new Paragraph({
        spacing: { before: 40, after: 80 },
        children: [run("No rendering on file.", { italics: true, size: 16, color: GREY })],
      }),
    ];
  }

  const figure: Paragraph[] = [];
  if (image) {
    figure.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new ImageRun({
            type: image.type,
            data: image.data,
            transformation: { width: image.width, height: image.height },
            altText: {
              name: space.name,
              title: space.name,
              description: `Rendering for ${space.name}`,
            },
          }),
        ],
      }),
    );
  } else {
    figure.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [run("No rendering on file.", { italics: true, size: 16, color: GREY })],
      }),
    );
  }
  figure.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(image ? space.image.fileName : "Rendering unavailable", { italics: true, size: 15, color: GREY })],
    }),
  );

  const textWidth = CONTENT_DXA - IMAGE_DXA;
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    columnWidths: [textWidth, IMAGE_DXA],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: textWidth, type: WidthType.DXA },
            borders: cellBorders,
            verticalAlign: VerticalAlignTable.TOP,
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: copy,
          }),
          new TableCell({
            width: { size: IMAGE_DXA, type: WidthType.DXA },
            borders: cellBorders,
            verticalAlign: VerticalAlignTable.CENTER,
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: figure,
          }),
        ],
      }),
    ],
  });
}

function gapParagraphs(gap: GuideGap, index: number): Paragraph[] {
  const where = gap.spaceName ?? "Project";
  return [
    new Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 20 },
      children: [
        run(`${index + 1}. ${gap.severityLabel} · ${gap.statusLabel}`, {
          bold: true,
          size: 19,
          color: gap.severity === "high" && gap.status === "open" ? RED : NAVY,
        }),
        run(`   ${where}`, { size: 18, color: GREY }),
      ],
    }),
    ...fact("Plan shows", gap.planShows || "—"),
    ...fact("Notes say", gap.notesSay || "—"),
    ...(gap.resolutionNote ? fact("Resolution", gap.resolutionNote) : []),
  ];
}

function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 47).trimEnd()}…`;
}

export function composeSpaceGuideDocument(
  model: SpaceGuideModel,
  images: ReadonlyMap<string, GuideRaster | null>,
): Document {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        run(`${model.projectName}: AV/IT Space-by-Space Discovery Guide`, {
          bold: true,
          size: 32,
          color: NAVY,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        run(
          `Owner ${model.owner}  ·  ${model.statusLabel}  ·  Printed ${model.printedOn}  ·  Draft for discussion`,
          { italics: true, size: 18, color: GREY },
        ),
      ],
    }),
    heading("Project summary", 1),
    summaryTable(model),
  ];

  if (model.spaces.length === 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [run("No rooms yet.")],
      }),
    );
  }

  let group = "";
  for (const space of model.spaces) {
    if (space.groupLabel !== group) {
      group = space.groupLabel;
      children.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 240, after: 20 },
          children: [run(group.toUpperCase(), { bold: true, size: 16, color: GREY })],
        }),
      );
    }
    children.push(heading(space.name, 1));
    const block = spaceTable(space, images.get(space.id) ?? null);
    if (Array.isArray(block)) children.push(...block);
    else children.push(block);
    if (space.sections.length === 0) {
      children.push(
        new Paragraph({
          spacing: { before: 80 },
          children: [run("No space systems are in scope, so this room has no checklist.")],
        }),
      );
    }
    for (const section of answeredGuideSections(space)) {
      children.push(heading(section.name, 2));
      for (const question of section.questions) children.push(...questionBlocks(question));
    }
    const open = openGuideQuestions(space);
    if (open.length > 0) {
      children.push(heading("Open questions", 2));
      for (const question of open) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [run(`${question.sectionName}: ${question.prompt}`, { size: 19 })],
          }),
        );
      }
    }
  }

  children.push(heading("Discrepancies", 1, true));
  if (model.gaps.length === 0) {
    children.push(new Paragraph({ children: [run("None recorded.")] }));
  } else {
    model.gaps.forEach((gap, index) => children.push(...gapParagraphs(gap, index)));
  }

  return new Document({
    title: `${model.projectName} — Space guide`,
    creator: "CMPLX iT",
    description: "AV/IT space-by-space discovery guide",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 19 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1008, bottom: 864, left: 1008, right: 1008, header: 500, footer: 500 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } },
                spacing: { after: 60 },
                children: [
                  run("CMPLX iT", { bold: true, size: 22, color: NAVY }),
                  run("  |  ", { size: 17, color: GREY }),
                  run(shortName(model.projectName), { size: 17, color: GREY }),
                  run("  |  AV/IT Space Discovery Guide  |  ", { size: 17, color: GREY }),
                  run("DRAFT FOR DISCUSSION", { bold: true, size: 17, color: RED }),
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
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 4 } },
                children: [
                  run("CMPLX iT  ·  Confidential  ·  Page ", { size: 15, color: GREY }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 15, color: GREY }),
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

export async function buildSpaceGuideDocument(model: SpaceGuideModel): Promise<Document> {
  const images = new Map<string, GuideRaster | null>();
  await Promise.all(
    model.spaces.map(async (space) => {
      if (!space.image) {
        images.set(space.id, null);
        return;
      }
      images.set(space.id, await fetchGuideImage(space.image.url, space.image.contentType));
    }),
  );
  return composeSpaceGuideDocument(model, images);
}

export async function downloadSpaceGuideDocx(model: SpaceGuideModel): Promise<void> {
  const blob = await Packer.toBlob(await buildSpaceGuideDocument(model));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = spaceGuideDocxFilename(model.projectName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
