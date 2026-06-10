import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, TableBorders, VerticalAlign, PageBreak,
  convertInchesToTwip, convertMillimetersToTwip,
} from "docx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../../.local/hmr-revenue-model.docx");

// ── Colour palette (hex without #) ──────────────────────────────────────────
const INDIGO      = "4F46E5";
const INDIGO_DARK = "3730A3";
const INDIGO_LIGHT= "EEF2FF";
const WHITE       = "FFFFFF";
const GRAY_900    = "111827";
const GRAY_700    = "374151";
const GRAY_100    = "F9FAFB";
const GRAY_300    = "D1D5DB";
const GREEN       = "059669";
const GREEN_LIGHT = "ECFDF5";
const AMBER       = "D97706";
const AMBER_LIGHT = "FFFBEB";
const RED         = "DC2626";
const RED_LIGHT   = "FEF2F2";

// ── Helper: plain paragraph ──────────────────────────────────────────────────
function p(text: string, opts: {
  bold?: boolean; size?: number; color?: string;
  spacing?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  indent?: number;
} = {}): Paragraph {
  return new Paragraph({
    spacing: { after: opts.spacing ?? 120 },
    indent: opts.indent ? { left: convertInchesToTwip(opts.indent) } : undefined,
    alignment: opts.align ?? AlignmentType.LEFT,
    children: [new TextRun({
      text,
      bold:  opts.bold ?? false,
      size:  (opts.size ?? 10) * 2,
      color: opts.color ?? GRAY_700,
    })],
  });
}

// ── Helper: empty spacer ──────────────────────────────────────────────────────
function spacer(pts = 6): Paragraph {
  return new Paragraph({ spacing: { after: 0, before: 0 }, children: [new TextRun({ text: "", size: pts * 2 })] });
}

// ── Helper: heading ──────────────────────────────────────────────────────────
function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: WHITE })],
    shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
  });
}

function h2(text: string, sub?: string): Paragraph[] {
  const items: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: sub ? 40 : 120 },
      border: { left: { style: BorderStyle.THICK, size: 12, color: INDIGO, space: 8 } },
      children: [new TextRun({ text, bold: true, size: 24, color: GRAY_900 })],
    }),
  ];
  if (sub) {
    items.push(new Paragraph({
      spacing: { before: 0, after: 120 },
      indent: { left: convertMillimetersToTwip(5) },
      children: [new TextRun({ text: sub, size: 17, color: "6B7280" })],
    }));
  }
  return items;
}

// ── Helper: callout box ───────────────────────────────────────────────────────
function callout(text: string, bg: string, fg: string, label?: string): Paragraph[] {
  const items: Paragraph[] = [];
  if (label) {
    items.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      indent: { left: convertInchesToTwip(0.15) },
      children: [new TextRun({ text: label, bold: true, size: 18, color: fg })],
      shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    }));
  }
  items.push(new Paragraph({
    spacing: { before: label ? 0 : 80, after: 160 },
    indent: { left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15) },
    children: [new TextRun({ text, size: 19, color: fg })],
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
  }));
  return items;
}

// ── Helper: bullet ────────────────────────────────────────────────────────────
function bullet(text: string, indent = 0.2): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(indent), hanging: convertInchesToTwip(0.15) },
    children: [
      new TextRun({ text: "•  ", bold: true, size: 20, color: INDIGO }),
      new TextRun({ text, size: 20, color: GRAY_700 }),
    ],
  });
}

// ── Helper: no-border style for table cells ──────────────────────────────────
const NO_BORDER: TableBorders = {
  top:    { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left:   { style: BorderStyle.NONE, size: 0, color: "auto" },
  right:  { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical:   { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const THIN_BORDER: TableBorders = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: GRAY_300 },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: GRAY_300 },
  left:   { style: BorderStyle.SINGLE, size: 4, color: GRAY_300 },
  right:  { style: BorderStyle.SINGLE, size: 4, color: GRAY_300 },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: GRAY_300 },
  insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: GRAY_300 },
};

// ── Helper: table cell ────────────────────────────────────────────────────────
function cell(
  text: string,
  opts: {
    bg?: string; fg?: string; bold?: boolean;
    width?: number; size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {}
): TableCell {
  const { bg, fg = GRAY_700, bold = false, width, size = 19 } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: bg ? { type: ShadingType.SOLID, color: bg, fill: bg } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { after: 0 },
      children: [new TextRun({ text, bold, size, color: fg })],
    })],
  });
}

// ── Helper: header row ────────────────────────────────────────────────────────
function headerRow(labels: string[], widths: number[], bg = INDIGO): TableRow {
  return new TableRow({
    tableHeader: true,
    children: labels.map((lbl, i) => cell(lbl, { bg, fg: WHITE, bold: true, width: widths[i], size: 19 })),
  });
}

// ── Helper: data row ──────────────────────────────────────────────────────────
function dataRow(cells_: string[], widths: number[], odd: boolean): TableRow {
  const bg = odd ? GRAY_100 : WHITE;
  return new TableRow({
    children: cells_.map((txt, i) => cell(txt, { bg, bold: i === 0, width: widths[i] })),
  });
}

// ── Helper: total row ──────────────────────────────────────────────────────────
function totalRow_(cells_: string[], widths: number[]): TableRow {
  return new TableRow({
    children: cells_.map((txt, i) => cell(txt, { bg: INDIGO_LIGHT, fg: INDIGO, bold: true, width: widths[i], size: 20 })),
  });
}

// ── Helper: two-col info table (no visible border) ───────────────────────────
function infoTable(left: { title: string; body: string; bg: string; fg: string },
                   right: { title: string; body: string; bg: string; fg: string }): Table {
  const hw = 4536; // ~3.15in each
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDER,
    rows: [
      new TableRow({ children: [
        new TableCell({
          width: { size: hw, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 120, right: 100 },
          shading: { type: ShadingType.SOLID, color: left.bg, fill: left.bg },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: left.title, bold: true, size: 18, color: left.fg })] }),
            new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: left.body, size: 19, color: GRAY_700 })] }),
          ],
        }),
        new TableCell({
          width: { size: hw, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 120, right: 100 },
          shading: { type: ShadingType.SOLID, color: right.bg, fill: right.bg },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: right.title, bold: true, size: 18, color: right.fg })] }),
            new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: right.body, size: 19, color: WHITE })] }),
          ],
        }),
      ]}),
    ],
  });
}

// ── Helper: metric strip table ────────────────────────────────────────────────
function metricStrip(items: [string, string][], bg = INDIGO_LIGHT, fg = INDIGO): Table {
  const w = Math.floor(9072 / items.length);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDER,
    rows: [
      new TableRow({ children: items.map(([val]) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: bg, fill: bg },
        margins: { top: 120, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: val, bold: true, size: 36, color: fg })] })],
      })) }),
      new TableRow({ children: items.map(([, lbl]) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: bg, fill: bg },
        margins: { top: 0, bottom: 120, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: lbl, size: 16, color: GRAY_700 })] })],
      })) }),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

const TW_FULL = 9072; // total content width in twips (≈ 6.3in)
const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 20, color: GRAY_700 },
        paragraph: { spacing: { after: 120 } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1",
        basedOn: "Normal", next: "Normal",
        run: { bold: true, size: 28, color: WHITE },
        paragraph: { spacing: { before: 320, after: 120 } },
      },
      {
        id: "Heading2", name: "Heading 2",
        basedOn: "Normal", next: "Normal",
        run: { bold: true, size: 24, color: GRAY_900 },
        paragraph: { spacing: { before: 280, after: 120 } },
      },
    ],
  },

  sections: [{
    properties: {
      page: {
        margin: {
          top:    convertInchesToTwip(0.9),
          bottom: convertInchesToTwip(0.9),
          left:   convertInchesToTwip(0.9),
          right:  convertInchesToTwip(0.9),
        },
      },
    },

    children: [

      // ════════════════════════════════════════════════════════════════════
      // COVER
      // ════════════════════════════════════════════════════════════════════
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
        children: [new TextRun({ text: "HMR  |  Hire Me Remotely", bold: true, size: 24, color: INDIGO_LIGHT })],
      }),
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
        children: [new TextRun({ text: "hiremeremotely.com", size: 18, color: "9CA3AF" })],
      }),
      spacer(10),
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
        children: [new TextRun({ text: "Revenue Model", bold: true, size: 52, color: WHITE })],
      }),
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
        children: [new TextRun({ text: "& Financial Forecast", bold: true, size: 52, color: "818CF8" })],
      }),
      spacer(8),
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
        children: [new TextRun({ text: "Year 1 Conservative Projection  ·  Business Model Overview  ·  Strategic Roadmap", size: 22, color: "A5B4FC" })],
      }),
      spacer(12),
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: "3730A3", fill: "3730A3" },
        children: [new TextRun({ text: "YEAR 1 CONSERVATIVE REVENUE TARGET", size: 18, color: "A5B4FC" })],
      }),
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: "3730A3", fill: "3730A3" },
        children: [new TextRun({ text: "~$776,000", bold: true, size: 80, color: WHITE })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        shading: { type: ShadingType.SOLID, color: "3730A3", fill: "3730A3" },
        children: [new TextRun({ text: "4 revenue streams  ·  Conservative assumptions  ·  No enterprise contracts counted", size: 18, color: "818CF8" })],
      }),
      metricStrip([
        ["$12,600", "Avg placement fee"],
        ["$500/mo", "Avg company plan"],
        ["120",     "Hires Year 1"],
        ["4",       "Revenue streams"],
      ], INDIGO_DARK, "A5B4FC"),
      spacer(10),
      new Paragraph({
        spacing: { after: 80 },
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: "1E1B4B", fill: "1E1B4B" },
        children: [new TextRun({ text: '"LinkedIn lets companies fish in the ocean themselves.', size: 24, color: "E0E7FF", italics: true })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: "1E1B4B", fill: "1E1B4B" },
        children: [new TextRun({ text: 'HMR catches the fish and delivers them to the dock."', size: 24, color: "E0E7FF", italics: true })],
      }),
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
        children: [
          new TextRun({ text: "CONFIDENTIAL  ·  Internal Use Only  ·  Prepared: ", size: 16, color: "6366F1" }),
          new TextRun({ text: dateStr, size: 16, color: "6366F1" }),
        ],
      }),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════════════════
      // SECTION 1: BUSINESS MODEL
      // ════════════════════════════════════════════════════════════════════
      h1("Business Model & Revenue Streams"),
      ...h2("Our Model: Managed Remote Placement"),
      ...callout(
        "HMR operates as a managed placement broker — not an open job board. Candidates build profiles on the platform. " +
        "Companies discover and express interest in candidates through HMR. Every introduction is mediated by HMR, which means " +
        "HMR earns a success fee on every confirmed hire and retains the relationship with both sides.",
        GRAY_100, GRAY_700
      ),
      spacer(4),
      infoTable(
        { title: "LINKEDIN MODEL",  body: "Open network → direct contact → earns ~$0 per hire", bg: INDIGO_LIGHT, fg: INDIGO },
        { title: "HMR MODEL",       body: "Mediated broker → every hire tracked → earns $3k–$20k per placement", bg: INDIGO, fg: "A5B4FC" }
      ),
      spacer(8),

      // ── Stream 1 ──
      ...h2("Stream 1 — Placement Fees", "Primary revenue driver · High value per transaction"),
      ...callout(
        "Companies already pay traditional recruiters $10,000–$30,000 per hire. HMR delivers a vetted, remote-ready pipeline " +
        "at a competitive rate with full process ownership — no self-sourcing required by the client.",
        GREEN_LIGHT, GREEN, "Why it works:"
      ),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: THIN_BORDER,
        rows: [
          headerRow(["Seniority Tier", "Salary Range", "HMR Fee %", "Example Fee (illustrative)"],
            [Math.round(TW_FULL*0.35), Math.round(TW_FULL*0.23), Math.round(TW_FULL*0.16), Math.round(TW_FULL*0.26)]),
          dataRow(["Junior / Mid",           "< $60,000",        "8–10%",   "~$5,000"],   [Math.round(TW_FULL*0.35), Math.round(TW_FULL*0.23), Math.round(TW_FULL*0.16), Math.round(TW_FULL*0.26)], true),
          dataRow(["Senior / Lead",          "$60,000–$120,000",  "12–15%",  "~$12,600"],  [Math.round(TW_FULL*0.35), Math.round(TW_FULL*0.23), Math.round(TW_FULL*0.16), Math.round(TW_FULL*0.26)], false),
          dataRow(["Executive / Specialist", "> $120,000",        "18–20%",  "~$24,000+"], [Math.round(TW_FULL*0.35), Math.round(TW_FULL*0.23), Math.round(TW_FULL*0.16), Math.round(TW_FULL*0.26)], true),
        ],
      }),
      spacer(4),
      ...callout("Example: A $90,000 remote engineering hire at 14%  =  $12,600 per placement", AMBER_LIGHT, AMBER),

      // ── Stream 2 ──
      ...h2("Stream 2 — Company Subscriptions", "Recurring monthly / annual plans for regular hirers"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: THIN_BORDER,
        rows: [
          headerRow(["Plan", "Price", "Active Jobs", "Requests/mo", "Included Features"],
            [Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.15), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.46)]),
          dataRow(["Starter",    "$299/month",  "3",         "10",        "Standard support"],                            [Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.15), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.46)], true),
          dataRow(["Growth",     "$799/month",  "Unlimited", "50",        "Priority matching + analytics dashboard"],     [Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.15), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.46)], false),
          dataRow(["Enterprise", "Custom",      "Unlimited", "Unlimited", "Dedicated manager + ATS integration + SLAs"], [Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.15), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.46)], true),
        ],
      }),
      spacer(8),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════════════════
      // SECTION 2: STREAMS 3–5 + PROJECTION
      // ════════════════════════════════════════════════════════════════════
      h1("Additional Revenue Streams & Year 1 Projection"),

      // ── Stream 3 ──
      ...h2("Stream 3 — Candidate Premium", "Optional upgrades · Free by default for all candidates"),
      p("Pricing: $9 – $19 per candidate per month. Free tier available — no credit card required. Annual billing = 2 months free.", { bold: false, size: 10 }),
      p("Premium unlocks:", { bold: true, color: INDIGO, size: 10 }),
      bullet("Profile boost — appear higher in company search results"),
      bullet("\"Actively Looking\" badge — signals urgency to HMR matching team"),
      bullet("Application analytics — see who viewed your profile and when"),
      bullet("Priority review by HMR matching team"),
      bullet("AI interview prep (Phase 3 feature)"),
      spacer(4),

      // ── Stream 4 ──
      ...h2("Stream 4 — Featured Job Listings", "Ad-style placements · Low-touch · High margin"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: THIN_BORDER,
        rows: [
          headerRow(["Listing Type", "Price", "Duration", "What's Included"],
            [Math.round(TW_FULL*0.25), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.12), Math.round(TW_FULL*0.50)]),
          dataRow(["Standard Featured",  "$99/week",   "7 days", "Pinned at top of job board"],                                          [Math.round(TW_FULL*0.25), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.12), Math.round(TW_FULL*0.50)], true),
          dataRow(["Premium Featured",   "$199/week",  "7 days", "Pinned + highlighted + email blast to matched candidates"],            [Math.round(TW_FULL*0.25), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.12), Math.round(TW_FULL*0.50)], false),
          dataRow(["Sponsored Bundle",   "$299/week",  "7 days", "All above + social post + newsletter mention"],                        [Math.round(TW_FULL*0.25), Math.round(TW_FULL*0.13), Math.round(TW_FULL*0.12), Math.round(TW_FULL*0.50)], true),
        ],
      }),
      spacer(4),

      // ── Stream 5 ──
      ...h2("Stream 5 — Talent Reports & Market Intelligence", "B2B data product · Year 2+ · High margin"),
      ...callout(
        "Anonymised salary benchmarks, skills demand heatmaps, and remote hiring trend reports sold to HR teams, " +
        "venture capital firms, and industry analysts. Price range: $500–$5,000 per report. Activates in Year 2 once " +
        "the dataset is large enough for meaningful insight.",
        GRAY_100, GRAY_700
      ),

      // ── Year 1 Projection ──
      ...h2("Year 1 Conservative Revenue Projection", "Based on conservative volume assumptions — no enterprise contracts included"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: THIN_BORDER,
        rows: [
          headerRow(["Revenue Stream", "Volume Assumption", "Unit Value", "Year 1 Revenue"],
            [Math.round(TW_FULL*0.30), Math.round(TW_FULL*0.28), Math.round(TW_FULL*0.18), Math.round(TW_FULL*0.24)]),
          dataRow(["Placement Fees",        "10 hires/month × 12 months",    "~$5,000 avg",  "$600,000"], [Math.round(TW_FULL*0.30), Math.round(TW_FULL*0.28), Math.round(TW_FULL*0.18), Math.round(TW_FULL*0.24)], true),
          dataRow(["Company Subscriptions", "20 companies × 12 months",      "$500/mo avg",  "$120,000"], [Math.round(TW_FULL*0.30), Math.round(TW_FULL*0.28), Math.round(TW_FULL*0.18), Math.round(TW_FULL*0.24)], false),
          dataRow(["Candidate Premium",     "200 subscribers × 12 months",   "$12/mo avg",   "$28,800"],  [Math.round(TW_FULL*0.30), Math.round(TW_FULL*0.28), Math.round(TW_FULL*0.18), Math.round(TW_FULL*0.24)], true),
          dataRow(["Featured Listings",     "15 listings/month × 12 months", "$150 avg",     "$27,000"],  [Math.round(TW_FULL*0.30), Math.round(TW_FULL*0.28), Math.round(TW_FULL*0.18), Math.round(TW_FULL*0.24)], false),
          dataRow(["Talent Reports",        "Year 2+ only",                  "—",            "$0"],       [Math.round(TW_FULL*0.30), Math.round(TW_FULL*0.28), Math.round(TW_FULL*0.18), Math.round(TW_FULL*0.24)], true),
          totalRow_(["Total Year 1 Revenue", "", "", "~$775,800"],
            [Math.round(TW_FULL*0.30), Math.round(TW_FULL*0.28), Math.round(TW_FULL*0.18), Math.round(TW_FULL*0.24)]),
        ],
      }),
      spacer(4),
      metricStrip([
        ["$600K",  "Placement Fees (80%)"],
        ["$120K",  "Subscriptions (15%)"],
        ["$28.8K", "Candidate Premium (4%)"],
        ["$27K",   "Featured Listings (3%)"],
      ]),
      spacer(8),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════════════════
      // SECTION 3: COMPARISON
      // ════════════════════════════════════════════════════════════════════
      h1("HMR vs LinkedIn — Competitive Analysis"),
      ...h2("Platform Comparison", "How HMR differs fundamentally from LinkedIn's model"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: THIN_BORDER,
        rows: [
          new TableRow({ tableHeader: true, children: [
            cell("Dimension",         { bg: GRAY_900,   fg: WHITE, bold: true, width: Math.round(TW_FULL*0.22) }),
            cell("LinkedIn",          { bg: RED,        fg: WHITE, bold: true, width: Math.round(TW_FULL*0.39) }),
            cell("Hire Me Remotely",  { bg: GREEN,      fg: WHITE, bold: true, width: Math.round(TW_FULL*0.39) }),
          ]}),
          ...[
            ["Business model",           "Open social network + job board",                "Managed placement broker"],
            ["Controls candidate data",  "LinkedIn (companies contact directly)",          "HMR — companies cannot contact directly"],
            ["Contact method",           "InMail direct to candidate",                     "All introductions mediated by HMR"],
            ["Candidate database",       "Semi-public, accessible to all subscribers",     "Proprietary — HMR controls access"],
            ["Recruiter cost",           "$8,000–$16,000/yr + self-sourcing",              "Subscription + placement fee → vetted shortlists"],
            ["Revenue per hire",         "~$0 per confirmed placement",                    "$3,000–$20,000 per confirmed placement"],
            ["Remote focus",             "No — general professional network",              "Yes — remote-only specialisation"],
            ["Candidate experience",     "Spam from hundreds of recruiters",               "Only hears from HMR who vets every intro"],
            ["Pre-screening",            "None — companies screen themselves",             "HMR pre-screens before any introduction"],
            ["Defensibility",            "Scale and broad network effects",                "Proprietary database + curated relationships"],
          ].map(([dim, lin, hmr], i) => new TableRow({ children: [
            cell(dim, { bg: i%2===0 ? GRAY_100 : WHITE, bold: true,   width: Math.round(TW_FULL*0.22), fg: GRAY_900 }),
            cell(lin, { bg: i%2===0 ? RED_LIGHT : "FFF7F7", width: Math.round(TW_FULL*0.39), fg: "B91C1C" }),
            cell(hmr, { bg: i%2===0 ? GREEN_LIGHT : "F0FDF4", width: Math.round(TW_FULL*0.39), fg: "065F46" }),
          ]})),
        ],
      }),
      spacer(6),
      ...h2("Unit Economics — Why HMR Wins"),
      ...callout(
        "Today a company pays LinkedIn Recruiter ($8,000–$16,000/year) PLUS a recruitment agency (15–25% per hire) — " +
        "up to $30,000+ per hire with no guaranteed outcome and full self-service sourcing.\n\n" +
        "HMR replaces both at a lower blended cost and delivers a curated, remote-ready shortlist with every introduction handled end-to-end.",
        INDIGO_LIGHT, INDIGO
      ),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════════════════════════
      // SECTION 4: ROADMAP
      // ════════════════════════════════════════════════════════════════════
      h1("Product Roadmap & Strategic Direction"),
      ...h2("Phased Product Roadmap", "From beta launch to full AI-powered hiring OS"),

      // Phase cards as table
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDER,
        rows: [
          new TableRow({ children: [
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 0, bottom: 0, left: 0, right: 100 },
              shading: { type: ShadingType.SOLID, color: INDIGO, fill: INDIGO },
              children: [
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "PHASE 1  ·  Foundation", bold: true, size: 17, color: "A5B4FC" })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Now → 3 months", bold: true, size: 20, color: WHITE })] }),
              ],
            }),
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 0, bottom: 0, left: 100, right: 0 },
              shading: { type: ShadingType.SOLID, color: "7C3AED", fill: "7C3AED" },
              children: [
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "PHASE 2  ·  Workflow", bold: true, size: 17, color: "DDD6FE" })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "3–6 months", bold: true, size: 20, color: WHITE })] }),
              ],
            }),
          ]}),
          new TableRow({ children: [
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 60, bottom: 120, left: 0, right: 100 },
              shading: { type: ShadingType.SOLID, color: GRAY_100, fill: GRAY_100 },
              children: [
                "Privacy & Express Interest system",
                "Company dashboard: pipeline + shortlists",
                "Placement fee tracking + Stripe invoicing",
                "Beta launch with core matching workflow",
              ].map(item => bullet(item)),
            }),
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 60, bottom: 120, left: 100, right: 0 },
              shading: { type: ShadingType.SOLID, color: GRAY_100, fill: GRAY_100 },
              children: [
                "Built-in interview scheduling (replaces Calendly)",
                "Embedded video interview rooms (replaces Zoom)",
                "Structured interview scorecards",
                "Offer letters with e-signature",
              ].map(item => bullet(item)),
            }),
          ]}),
          new TableRow({ children: [
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 0, bottom: 0, left: 0, right: 100 },
              shading: { type: ShadingType.SOLID, color: "0891B2", fill: "0891B2" },
              children: [
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "PHASE 3  ·  AI Layer", bold: true, size: 17, color: "BAE6FD" })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "6–12 months", bold: true, size: 20, color: WHITE })] }),
              ],
            }),
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 0, bottom: 0, left: 100, right: 0 },
              shading: { type: ShadingType.SOLID, color: GREEN, fill: GREEN },
              children: [
                new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "PHASE 4  ·  Platform", bold: true, size: 17, color: "A7F3D0" })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "12+ months", bold: true, size: 20, color: WHITE })] }),
              ],
            }),
          ]}),
          new TableRow({ children: [
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 60, bottom: 120, left: 0, right: 100 },
              shading: { type: ShadingType.SOLID, color: GRAY_100, fill: GRAY_100 },
              children: [
                "AI async screening interviews (HireVue-style)",
                "AI matching engine trained on past placements",
                "AI interview copilot — live transcription",
                "AI candidate coaching (drives premium)",
              ].map(item => bullet(item)),
            }),
            new TableCell({
              width: { size: Math.round(TW_FULL*0.5)-100, type: WidthType.DXA },
              margins: { top: 60, bottom: 120, left: 100, right: 0 },
              shading: { type: ShadingType.SOLID, color: GRAY_100, fill: GRAY_100 },
              children: [
                "ATS integrations (Greenhouse, Lever)",
                "Background checks (Checkr partnership)",
                "Payroll partnerships (Deel, Remote.com referral)",
                "Talent intelligence reports for VCs + HR",
              ].map(item => bullet(item)),
            }),
          ]}),
        ],
      }),
      spacer(8),

      ...h2("Final Strategic Direction"),
      p("HMR is not a job board. Job boards earn from listings. HMR earns from outcomes.", { bold: false }),
      p("HMR is not a social network. LinkedIn earns from attention. HMR earns from hires.", { bold: false }),
      p("HMR is the end-to-end remote hiring operating system — discovery, screening, introduction, interviews, offers, onboarding. All in one platform.", { bold: true, color: INDIGO }),
      spacer(4),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        shading: { type: ShadingType.SOLID, color: INDIGO_DARK, fill: INDIGO_DARK },
        children: [new TextRun({ text: '"HMR is the only remote hiring platform that earns on the outcome, not the activity."', bold: true, size: 26, color: WHITE, italics: true })],
      }),
      spacer(4),
      metricStrip([
        ["~$776K",   "Year 1 Revenue Target"],
        ["$3K–$20K", "Earned Per Placement"],
        ["4 streams","Diversified Revenue"],
        ["Phase 1–4","Roadmap to Hiring OS"],
      ]),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buffer);
console.log("DOCX → " + OUT);
