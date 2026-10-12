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
  TextRun,
} from "docx";
import { formatDate } from "./dates";
import {
  ANSWER_STATUS_LABEL,
  APPLIES_TO_LABEL,
  exportAnswerText,
  kickoffDocxFilename,
  questionIsVisible,
} from "./systems";
import type {
  KickoffQuestion,
  ProjectQuestionAnswer,
  ProjectSystemScope,
  TechnologySystem,
} from "./types";

const INK = "0C0C0B";
const INK_SOFT = "3C3832";
const COPPER = "9A4A2A";

type ExportInput = {
  projectName: string;
  owner: string;
  systems: TechnologySystem[];
  questions: KickoffQuestion[];
  scope: ProjectSystemScope[];
  answers: ProjectQuestionAnswer[];
};

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

function answerParagraphs(body: string): Paragraph[] {
  const text = exportAnswerText(body);
  return text.split("\n").map(
    (line, index) =>
      new Paragraph({
        keepLines: true,
        spacing: { after: index === text.split("\n").length - 1 ? 160 : 40 },
        children: [run(line.length > 0 ? line : " ", { size: 21 })],
      }),
  );
}

export function buildKickoffDocument(input: ExportInput): Document {
  const inScope = new Set(input.scope.filter((row) => row.in_scope).map((row) => row.system_key));
  const systems = [...input.systems].sort((a, b) => a.sort_order - b.sort_order);
  const names = new Map(systems.map((system) => [system.key, system.name]));
  const covered = new Set(input.questions.flatMap((question) => question.system_keys));
  const held = systems.filter((system) => inScope.has(system.key) && !covered.has(system.key));
  const visible = input.questions
    .filter((question) => questionIsVisible(question, inScope))
    .sort((a, b) => a.sort_order - b.sort_order);
  const answers = new Map(input.answers.map((answer) => [answer.question_key, answer]));

  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        run("Technology basis of design", {
          bold: true,
          font: "Georgia",
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [run(input.projectName, { font: "Georgia", size: 28 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        run(
          `Owner ${input.owner || "—"}  ·  Printed ${formatDate(new Date().toISOString().slice(0, 10))}`,
          { size: 18, color: INK_SOFT, italics: true },
        ),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      keepNext: true,
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 1 },
      },
      spacing: { before: 120, after: 120 },
      children: [run("Scope", { bold: true, font: "Georgia", size: 26 })],
    }),
  ];

  const selected = systems.filter((system) => inScope.has(system.key));
  const omitted = systems.filter((system) => !inScope.has(system.key));
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        run("In scope. ", { bold: true, size: 21 }),
        run(
          selected.length
            ? selected
                .map((system) => `${system.name} (${APPLIES_TO_LABEL[system.applies_to]})`)
                .join(" · ")
            : "None selected.",
        ),
      ],
    }),
  );
  children.push(
    new Paragraph({
      spacing: { after: held.length ? 80 : 160 },
      children: [
        run("Not in this pass. ", { bold: true, size: 21 }),
        run(omitted.length ? omitted.map((system) => system.name).join(" · ") : "None."),
      ],
    }),
  );
  if (held.length) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          run("Held for discovery. ", { bold: true, size: 21 }),
          run(
            `${held.map((system) => system.name).join(" · ")} ${held.length === 1 ? "is" : "are"} in scope and ${held.length === 1 ? "has" : "have"} no kickoff questions yet.`,
          ),
        ],
      }),
    );
  }

  if (visible.length === 0) {
    children.push(
      new Paragraph({
        children: [
          run("No questions are in scope. Turn systems on to include their question set."),
        ],
      }),
    );
  }

  let sectionKey = "";
  for (const question of visible) {
    if (question.section_key !== sectionKey) {
      sectionKey = question.section_key;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          keepNext: true,
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 1 },
          },
          spacing: { before: 280, after: 120 },
          children: [run(question.section_name, { bold: true, font: "Georgia", size: 26 })],
        }),
      );
    }
    const answer = answers.get(question.key);
    const status = answer?.status ?? "open";
    const systemLabel = question.system_keys
      .map((key) => names.get(key) ?? key)
      .join(" · ");
    children.push(
      new Paragraph({
        keepNext: true,
        keepLines: true,
        spacing: { before: 160, after: 40 },
        children: [run(question.prompt, { bold: true })],
      }),
      new Paragraph({
        keepNext: true,
        spacing: { after: 60 },
        children: [
          run(ANSWER_STATUS_LABEL[status], {
            bold: true,
            size: 16,
            color: COPPER,
          }),
          run(`   ${systemLabel}`, { size: 16, color: INK_SOFT }),
        ],
      }),
    );
    children.push(...answerParagraphs(answer?.body ?? ""));
  }

  return new Document({
    title: `${input.projectName} — Kickoff questionnaire`,
    creator: "CMPLX iT",
    description: "Technology basis of design questionnaire",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 21 },
        },
      },
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
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 8, color: INK, space: 6 },
                },
                spacing: { after: 80 },
                children: [
                  run("CMPLX iT", { bold: true, size: 20 }),
                  run("   ·   ", { size: 16, color: INK_SOFT }),
                  run("Kickoff questionnaire", { size: 16, color: INK_SOFT }),
                  run("   ·   ", { size: 16, color: INK_SOFT }),
                  run("Smarter systems. Simpler spaces.", { italics: true, size: 16, color: INK_SOFT }),
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
                border: {
                  top: { style: BorderStyle.SINGLE, size: 6, color: "CFC6B6", space: 6 },
                },
                children: [
                  run("CMPLX iT  ·  Page ", { size: 15, color: INK_SOFT }),
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

export async function downloadKickoffDocx(input: ExportInput): Promise<void> {
  const blob = await Packer.toBlob(buildKickoffDocument(input));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = kickoffDocxFilename(input.projectName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
