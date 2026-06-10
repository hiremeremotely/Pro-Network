import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../../.local/hmr-revenue-model.pdf");

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  indigo:      "#4F46E5",
  indigoDark:  "#3730A3",
  indigoLight: "#EEF2FF",
  indigoMid:   "#818CF8",
  white:       "#FFFFFF",
  gray900:     "#111827",
  gray700:     "#374151",
  gray500:     "#6B7280",
  gray300:     "#D1D5DB",
  gray100:     "#F9FAFB",
  green:       "#059669",
  greenLight:  "#ECFDF5",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
  red:         "#DC2626",
};

// ── Page geometry ─────────────────────────────────────────────────────────────
const PW = 612;
const PH = 792;
const M  = 52;
const CW = PW - M * 2;

const doc = new PDFDocument({ size: "LETTER", margin: 0, info: {
  Title: "Hire Me Remotely — Revenue Model",
  Author: "Hire Me Remotely",
  Subject: "Year 1 Revenue Projection & Business Model",
} });

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════
function rule(y: number, color = C.gray300, opacity = 1) {
  doc.save().opacity(opacity).moveTo(M, y).lineTo(PW - M, y).strokeColor(color).lineWidth(0.5).stroke().restore();
}

function badge(x: number, y: number, label: string, bg: string, fg: string) {
  const pad = 8;
  doc.font("Helvetica-Bold").fontSize(8);
  const w = doc.widthOfString(label) + pad * 2;
  doc.roundedRect(x, y, w, 16, 4).fill(bg);
  doc.fillColor(fg).text(label, x + pad, y + 3.5, { lineBreak: false });
  return w;
}

function chip(x: number, y: number, text: string) {
  return badge(x, y, text, C.indigoLight, C.indigo);
}

// Draws a full-width section heading with indigo left border
function sectionHeading(y: number, title: string, subtitle?: string): number {
  doc.rect(M, y, 4, subtitle ? 34 : 22).fill(C.indigo);
  doc.font("Helvetica-Bold").fontSize(15).fillColor(C.gray900)
     .text(title, M + 14, y, { lineBreak: false });
  if (subtitle) {
    doc.font("Helvetica").fontSize(9).fillColor(C.gray500)
       .text(subtitle, M + 14, y + 20, { lineBreak: false });
  }
  return y + (subtitle ? 46 : 32);
}

// Simple table: returns Y after table
function table(
  startY: number,
  headers: string[],
  rows: string[][],
  colW: number[],
  opts: { headerBg?: string; headerFg?: string; rowHeight?: number; fontSize?: number } = {}
): number {
  const {
    headerBg = C.indigo, headerFg = C.white,
    rowHeight = 22, fontSize = 8.5,
  } = opts;
  let y = startY;
  const totalW = colW.reduce((a, b) => a + b, 0);

  // Header
  doc.rect(M, y, totalW, rowHeight).fill(headerBg);
  let cx = M;
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(headerFg)
       .text(h, cx + 6, y + (rowHeight - fontSize) / 2, { width: colW[i] - 12, lineBreak: false });
    cx += colW[i];
  });
  y += rowHeight;

  // Rows
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? C.white : C.gray100;
    doc.rect(M, y, totalW, rowHeight).fill(bg);
    cx = M;
    row.forEach((cell, ci) => {
      const bold = ci === 0;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize).fillColor(C.gray700)
         .text(cell, cx + 6, y + (rowHeight - fontSize) / 2, { width: colW[ci] - 12, lineBreak: false });
      cx += colW[ci];
    });
    // Row border
    doc.rect(M, y, totalW, rowHeight).strokeColor(C.gray300).lineWidth(0.3).stroke();
    y += rowHeight;
  });

  // Outer border
  doc.rect(M, startY, totalW, y - startY).strokeColor(C.gray300).lineWidth(0.5).stroke();
  return y;
}

// Highlighted total row (appended after table)
function totalRow(y: number, cells: string[], colW: number[], bg = C.indigoLight) {
  const totalW = colW.reduce((a, b) => a + b, 0);
  doc.rect(M, y, totalW, 24).fill(bg);
  let cx = M;
  cells.forEach((cell, i) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.indigo)
       .text(cell, cx + 6, y + 7, { width: colW[i] - 12, lineBreak: false });
    cx += colW[i];
  });
  doc.rect(M, y, totalW, 24).strokeColor(C.indigo).lineWidth(0.8).stroke();
  return y + 24;
}

// Metric card: x, y, w, h
function metricCard(x: number, y: number, w: number, h: number, value: string, label: string, sub?: string) {
  doc.roundedRect(x, y, w, h, 6).fill(C.indigoLight);
  doc.font("Helvetica-Bold").fontSize(22).fillColor(C.indigo)
     .text(value, x, y + 14, { width: w, align: "center", lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.gray700)
     .text(label, x, y + 40, { width: w, align: "center", lineBreak: false });
  if (sub) {
    doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
       .text(sub, x, y + 53, { width: w, align: "center", lineBreak: false });
  }
}

// Phase card
function phaseCard(x: number, y: number, w: number, num: string, title: string, items: string[], color: string) {
  const h = 26 + items.length * 14 + 10;
  doc.roundedRect(x, y, w, h, 5).fill(C.gray100);
  doc.rect(x, y, w, 26).fill(color);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white)
     .text(`Phase ${num}`, x + 10, y + 5, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white)
     .text(title, x + 10, y + 14, { width: w - 20, lineBreak: false });
  items.forEach((item, i) => {
    doc.font("Helvetica").fontSize(8).fillColor(C.gray700)
       .text(`• ${item}`, x + 10, y + 32 + i * 14, { width: w - 20, lineBreak: false });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ═════════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, PW, PH).fill(C.indigoDark);

// Top geometric accent
doc.save().opacity(0.15)
   .circle(PW - 60, 80, 180).fill(C.white)
   .restore();
doc.save().opacity(0.08)
   .circle(80, PH - 60, 220).fill(C.white)
   .restore();
doc.save().opacity(0.06)
   .rect(0, PH - 200, PW, 200).fill(C.white)
   .restore();

// Brand mark area
doc.roundedRect(M, 68, 52, 52, 10).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(28).fillColor(C.white)
   .text("HMR", M + 4, 80, { lineBreak: false });

doc.font("Helvetica-Bold").fontSize(12).fillColor(C.indigoMid)
   .text("Hire Me Remotely", M + 62, 76, { lineBreak: false });
doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.5)")
   .text("hiremeremotely.com", M + 62, 92, { lineBreak: false });

// Divider
doc.moveTo(M, 142).lineTo(PW - M, 142).strokeColor("rgba(255,255,255,0.15)").lineWidth(0.5).stroke();

// Main title
doc.font("Helvetica-Bold").fontSize(38).fillColor(C.white)
   .text("Revenue Model", M, 166, { lineBreak: false });
doc.font("Helvetica-Bold").fontSize(38).fillColor(C.indigoMid)
   .text("& Financial Forecast", M, 210, { lineBreak: false });

// Subtitle
doc.font("Helvetica").fontSize(13).fillColor("rgba(255,255,255,0.7)")
   .text("Year 1 Conservative Projection  ·  Business Model Overview  ·  Strategic Roadmap", M, 262, { width: CW });

// Hero metric
doc.roundedRect(M, 308, CW, 110, 10).fill("rgba(255,255,255,0.07)");
doc.moveTo(M, 308).lineTo(PW - M, 308).lineTo(PW - M, 418).lineTo(M, 418).closePath()
   .strokeColor("rgba(255,255,255,0.15)").lineWidth(0.5).stroke();

doc.font("Helvetica").fontSize(11).fillColor("rgba(255,255,255,0.5)")
   .text("YEAR 1 CONSERVATIVE REVENUE TARGET", M + 24, 326, { lineBreak: false });
doc.font("Helvetica-Bold").fontSize(52).fillColor(C.white)
   .text("~$776,000", M + 24, 344, { lineBreak: false });
doc.font("Helvetica").fontSize(10).fillColor(C.indigoMid)
   .text("Across 4 revenue streams  ·  Conservative assumptions  ·  No enterprise contracts", M + 24, 400, { lineBreak: false });

// 4 mini stats
const stats = [
  ["$12,600", "Avg placement fee"],
  ["$500/mo", "Avg company plan"],
  ["120", "Hires Year 1"],
  ["4", "Revenue streams"],
];
stats.forEach(([val, lbl], i) => {
  const sx = M + i * (CW / 4) + 16;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.white).text(val, M + i * (CW / 4), 452, { width: CW / 4, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor("rgba(255,255,255,0.5)").text(lbl, M + i * (CW / 4), 472, { width: CW / 4, align: "center", lineBreak: false });
});

// Tagline box
doc.roundedRect(M, 510, CW, 60, 8).fill("rgba(255,255,255,0.05)");
doc.font("Helvetica").fontSize(13).fillColor("rgba(255,255,255,0.85)")
   .text('"LinkedIn lets companies fish in the ocean themselves.\nHMR catches the fish and delivers them to the dock."', M + 20, 524, { width: CW - 40, align: "center" });

// Model type chips
const chips = ["Managed Placement Broker", "Success-Fee Revenue", "Remote-Only Focus", "End-to-End Hiring OS"];
let chipX = M;
chips.forEach(c => {
  doc.roundedRect(chipX, 592, doc.font("Helvetica-Bold").fontSize(7.5).widthOfString(c) + 16, 18, 9)
     .fill("rgba(255,255,255,0.12)");
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.white)
     .text(c, chipX + 8, 596.5, { lineBreak: false });
  chipX += doc.widthOfString(c) + 28;
});

// Footer
doc.moveTo(M, PH - 68).lineTo(PW - M, PH - 68).strokeColor("rgba(255,255,255,0.1)").lineWidth(0.5).stroke();
doc.font("Helvetica").fontSize(8).fillColor("rgba(255,255,255,0.35)")
   .text("CONFIDENTIAL  ·  Internal Use Only", M, PH - 54, { lineBreak: false });
const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
doc.text(`Prepared: ${dateStr}`, M, PH - 54, { width: CW, align: "right", lineBreak: false });

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 2 — BUSINESS MODEL + REVENUE STREAMS 1 & 2
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);

// Header bar
doc.rect(0, 0, PW, 48).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(13).fillColor(C.white)
   .text("Business Model & Revenue Streams", M, 16, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.indigoMid)
   .text("How Hire Me Remotely earns", PW - M - 200, 20, { width: 200, align: "right", lineBreak: false });

let y = 68;

// Business model overview
y = sectionHeading(y, "Our Model: Managed Remote Placement");

doc.roundedRect(M, y, CW, 52, 6).fill(C.gray100);
doc.font("Helvetica").fontSize(9.5).fillColor(C.gray700)
   .text(
     "HMR operates as a managed placement broker — not an open job board. Candidates build profiles on the platform. " +
     "Companies discover and express interest in candidates through HMR. Every introduction is mediated by HMR, which means " +
     "HMR earns a fee on every confirmed hire and retains the relationship with both sides.",
     M + 14, y + 10, { width: CW - 28 }
   );
y += 64;

// Comparison strip: HMR vs LinkedIn
doc.roundedRect(M, y, CW / 2 - 6, 42, 5).fill(C.indigoLight);
doc.font("Helvetica-Bold").fontSize(8).fillColor(C.indigo).text("LINKEDIN MODEL", M + 12, y + 7, { lineBreak: false });
doc.font("Helvetica").fontSize(8.5).fillColor(C.gray700)
   .text("Open network → direct contact → earns ~$0 per hire", M + 12, y + 20, { width: CW / 2 - 30, lineBreak: false });

doc.roundedRect(M + CW / 2 + 6, y, CW / 2 - 6, 42, 5).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(8).fillColor(C.indigoMid).text("HMR MODEL", M + CW / 2 + 18, y + 7, { lineBreak: false });
doc.font("Helvetica").fontSize(8.5).fillColor(C.white)
   .text("Mediated broker → every hire tracked → earns $3k–$20k per placement", M + CW / 2 + 18, y + 20, { width: CW / 2 - 30, lineBreak: false });
y += 56;

rule(y); y += 16;

// ── Stream 1: Placement Fees ──────────────────────────────────────────────────
y = sectionHeading(y, "Stream 1 — Placement Fees", "Primary revenue driver · High value per transaction");

// Why it works callout
doc.roundedRect(M, y, CW, 34, 5).fill(C.greenLight);
doc.font("Helvetica-Bold").fontSize(8).fillColor(C.green).text("Why it works:", M + 12, y + 6, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.gray700)
   .text("Companies already pay traditional recruiters $10,000–$30,000 per hire. HMR delivers a vetted, remote-ready pipeline at a competitive rate with full process ownership.", M + 12, y + 17, { width: CW - 24, lineBreak: false });
y += 46;

y = table(
  y,
  ["Seniority Tier", "Salary Range", "HMR Fee %", "Example Fee"],
  [
    ["Junior / Mid",               "< $60,000",        "8–10%",   "~$5,000"],
    ["Senior / Lead",              "$60,000–$120,000",  "12–15%",  "~$12,600"],
    ["Executive / Specialist",     "> $120,000",        "18–20%",  "~$24,000+"],
  ],
  [CW * 0.35, CW * 0.25, CW * 0.18, CW * 0.22],
  { rowHeight: 24 }
);
y += 8;

doc.roundedRect(M, y, CW, 26, 5).fill(C.amberLight);
doc.font("Helvetica").fontSize(8.5).fillColor(C.amber)
   .text("Example: A $90,000 remote engineering hire at 14% =  ", M + 14, y + 8, { continued: true, lineBreak: false });
doc.font("Helvetica-Bold").fontSize(9).fillColor(C.amber).text("$12,600 per placement", { lineBreak: false });
y += 38;

rule(y); y += 14;

// ── Stream 2: Company Subscriptions ──────────────────────────────────────────
y = sectionHeading(y, "Stream 2 — Company Subscriptions", "Recurring monthly/annual plans for regular hirers");

y = table(
  y,
  ["Plan", "Price", "Active Jobs", "Interest Requests", "Extras"],
  [
    ["Starter",    "$299/month",  "3",          "10/month",    "Standard support"],
    ["Growth",     "$799/month",  "Unlimited",  "50/month",    "Priority matching + analytics"],
    ["Enterprise", "Custom",      "Unlimited",  "Unlimited",   "Dedicated manager + ATS integration + custom SLAs"],
  ],
  [CW * 0.15, CW * 0.17, CW * 0.14, CW * 0.18, CW * 0.36],
  { rowHeight: 26, fontSize: 8 }
);
y += 14;

// ─ Footer ─────────────────────────────────────────────────────────────────────
rule(PH - 32);
doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
   .text("Hire Me Remotely  ·  Revenue Model  ·  CONFIDENTIAL", M, PH - 24, { lineBreak: false })
   .text("Page 2 of 5", M, PH - 24, { width: CW, align: "right", lineBreak: false });

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 3 — STREAMS 3, 4, 5 + YEAR 1 PROJECTION
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);
doc.rect(0, 0, PW, 48).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(13).fillColor(C.white)
   .text("Additional Revenue Streams & Year 1 Projection", M, 16, { lineBreak: false });

y = 68;

// ── Stream 3: Candidate Premium ───────────────────────────────────────────────
y = sectionHeading(y, "Stream 3 — Candidate Premium", "Optional upgrades · Free by default for all candidates");

const premFeatures = [
  "Profile boost — appear higher in company search results",
  "\"Actively Looking\" badge — signals urgency to HMR matching team",
  "Application analytics — see who viewed your profile and when",
  "Priority review by HMR matching team",
  "AI interview prep (Phase 3 feature)",
];
const colA = CW / 2 - 8;

doc.roundedRect(M, y, colA, 110, 5).fill(C.gray100);
doc.font("Helvetica-Bold").fontSize(8).fillColor(C.gray700).text("PRICING", M + 12, y + 10, { lineBreak: false });
doc.font("Helvetica-Bold").fontSize(22).fillColor(C.indigo).text("$9–$19", M + 12, y + 22, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.gray500).text("per month per candidate", M + 12, y + 48, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.gray500).text("Free tier available — no credit card required", M + 12, y + 62, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.gray500).text("Annual billing = 2 months free", M + 12, y + 76, { lineBreak: false });

doc.roundedRect(M + colA + 16, y, colA, 110, 5).fill(C.indigoLight);
doc.font("Helvetica-Bold").fontSize(8).fillColor(C.indigo).text("PREMIUM FEATURES", M + colA + 28, y + 10, { lineBreak: false });
premFeatures.forEach((f, i) => {
  doc.font("Helvetica").fontSize(7.5).fillColor(C.gray700)
     .text(`• ${f}`, M + colA + 28, y + 22 + i * 16, { width: colA - 24, lineBreak: false });
});
y += 122;

rule(y); y += 14;

// ── Stream 4: Featured Job Listings ───────────────────────────────────────────
y = sectionHeading(y, "Stream 4 — Featured Job Listings", "Ad-style placements · Low-touch · High margin");

y = table(
  y,
  ["Listing Type", "Price", "Duration", "Notes"],
  [
    ["Standard Featured",  "$99/week",   "7 days",  "Pinned at top of job board"],
    ["Premium Featured",   "$199/week",  "7 days",  "Pinned + highlighted + email blast to matched candidates"],
    ["Sponsored Bundle",   "$299/week",  "7 days",  "All premium features + social post + newsletter mention"],
  ],
  [CW * 0.28, CW * 0.16, CW * 0.14, CW * 0.42],
  { rowHeight: 24 }
);
y += 14;

rule(y); y += 14;

// ── Stream 5: Talent Reports ───────────────────────────────────────────────────
y = sectionHeading(y, "Stream 5 — Talent Reports & Market Intelligence", "B2B data product · Future revenue · High margin");

doc.roundedRect(M, y, CW, 40, 5).fill(C.gray100);
doc.font("Helvetica").fontSize(8.5).fillColor(C.gray700)
   .text(
     "Anonymised salary benchmarks, skills demand heatmaps, remote work trend reports, and hiring cycle data sold to HR teams, " +
     "venture capital firms, and industry analysts. Price range: $500–$5,000 per report. Activates in Year 2 once dataset is large enough for meaningful insight.",
     M + 14, y + 10, { width: CW - 28 }
   );
y += 54;

rule(y); y += 14;

// ── Year 1 Revenue Projection ─────────────────────────────────────────────────
y = sectionHeading(y, "Year 1 Conservative Revenue Projection", "Based on conservative volume assumptions — no enterprise contracts included");

y = table(
  y,
  ["Revenue Stream", "Volume Assumption", "Unit Value", "Year 1 Revenue"],
  [
    ["Placement Fees",         "10 hires/month × 12 months",   "~$5,000 avg",    "$600,000"],
    ["Company Subscriptions",  "20 companies × 12 months",     "$500/mo avg",    "$120,000"],
    ["Candidate Premium",      "200 users × 12 months",        "$12/mo avg",     "$28,800"],
    ["Featured Job Listings",  "15 listings/month × 12 months","$150 avg",       "$27,000"],
    ["Talent Reports",         "0 (Phase 2 only)",             "—",              "$0"],
  ],
  [CW * 0.30, CW * 0.28, CW * 0.18, CW * 0.24],
  { rowHeight: 24 }
);
y = totalRow(y, ["Total Year 1 Revenue", "", "", "~$775,800"], [CW * 0.30, CW * 0.28, CW * 0.18, CW * 0.24]);
y += 14;

// 4 metric cards
const cardW = (CW - 12) / 4;
metricCard(M,                   y, cardW, 72, "$600K",    "Placement Fees",      "80% of total");
metricCard(M + cardW + 4,       y, cardW, 72, "$120K",    "Subscriptions",       "15% of total");
metricCard(M + (cardW + 4) * 2, y, cardW, 72, "$28.8K",   "Candidate Premium",   "4% of total");
metricCard(M + (cardW + 4) * 3, y, cardW, 72, "$27K",     "Featured Listings",   "3% of total");

rule(PH - 32);
doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
   .text("Hire Me Remotely  ·  Revenue Model  ·  CONFIDENTIAL", M, PH - 24, { lineBreak: false })
   .text("Page 3 of 5", M, PH - 24, { width: CW, align: "right", lineBreak: false });

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 4 — HMR VS LINKEDIN COMPARISON
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);
doc.rect(0, 0, PW, 48).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(13).fillColor(C.white)
   .text("HMR vs LinkedIn — Competitive Analysis", M, 16, { lineBreak: false });

y = 68;
y = sectionHeading(y, "Platform Comparison", "How HMR differs fundamentally from LinkedIn's model");

// Custom comparison table with colour-coded columns
const compRows: [string, string, string][] = [
  ["Business model",          "Open social network + job board",              "Managed placement broker"],
  ["Controls candidate data", "LinkedIn (companies contact candidates directly)","HMR — companies cannot contact candidates directly"],
  ["Contact method",          "InMail direct to candidate",                   "All introductions mediated by HMR"],
  ["Candidate database",      "Semi-public / accessible to all",              "Proprietary — HMR controls access"],
  ["Recruiter cost",          "$8,000–$16,000/year + company sources alone",  "Subscription + placement fee → vetted shortlists delivered"],
  ["Revenue per hire",        "~$0 (LinkedIn earns nothing per placement)",   "$3,000–$20,000 per placement"],
  ["Remote focus",            "No — general professional network",            "Yes — remote-only specialisation"],
  ["Candidate experience",    "Spam from hundreds of recruiters",             "Only hears from HMR who vets every introduction"],
  ["Defensibility",           "Scale and broad network effects",              "Proprietary database + curated relationships"],
  ["Screening",               "None — companies screen themselves",           "HMR pre-screens candidates before any introduction"],
];

const c1 = 180, c2 = (CW - c1) / 2, c3 = (CW - c1) / 2;

// Header
doc.rect(M, y, c1, 26).fill(C.gray900);
doc.rect(M + c1, y, c2, 26).fill("#DC2626");
doc.rect(M + c1 + c2, y, c3, 26).fill(C.green);
doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.white)
   .text("Dimension", M + 8, y + 9, { lineBreak: false });
doc.text("LinkedIn", M + c1 + 8, y + 9, { lineBreak: false });
doc.text("Hire Me Remotely", M + c1 + c2 + 8, y + 9, { lineBreak: false });
y += 26;

compRows.forEach((row, i) => {
  const rh = 30;
  doc.rect(M, y, c1, rh).fill(i % 2 === 0 ? C.gray100 : C.white);
  doc.rect(M + c1, y, c2, rh).fill(i % 2 === 0 ? "#FEF2F2" : "#FFF5F5");
  doc.rect(M + c1 + c2, y, c3, rh).fill(i % 2 === 0 ? C.greenLight : "#F0FDF4");
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.gray900)
     .text(row[0], M + 8, y + 4, { width: c1 - 16, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor("#DC2626")
     .text(row[1], M + c1 + 8, y + 4, { width: c2 - 16 });
  doc.font("Helvetica").fontSize(7.5).fillColor(C.green)
     .text(row[2], M + c1 + c2 + 8, y + 4, { width: c3 - 16 });
  y = Math.max(y + rh, doc.y + 4);
  doc.rect(M, y - (i % 2 === 0 ? 0 : 0), CW, 0.3).strokeColor(C.gray300).lineWidth(0.3).stroke();
});
doc.rect(M, 94, CW, y - 94).strokeColor(C.gray300).lineWidth(0.5).stroke();
y += 16;

// Unit economics callout
y = sectionHeading(y, "Unit Economics — Why HMR Wins");
doc.roundedRect(M, y, CW, 64, 6).fill(C.indigoLight);
doc.font("Helvetica-Bold").fontSize(10).fillColor(C.indigo)
   .text("Today a company pays:", M + 18, y + 12, { lineBreak: false });
doc.font("Helvetica").fontSize(9.5).fillColor(C.gray700)
   .text(
     "LinkedIn Recruiter ($8,000–$16,000/year)  +  Recruitment agency (15–25% placement fee)\n" +
     "= Up to $30,000+ per hire with no guaranteed outcome and full self-service sourcing.",
     M + 18, y + 26, { width: CW - 36 }
   );
doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.indigo)
   .text("HMR replaces both at a lower blended cost — and delivers a curated, remote-ready shortlist with introductions handled end-to-end.", M + 18, y + 46, { width: CW - 36, lineBreak: false });
y += 80;

rule(PH - 32);
doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
   .text("Hire Me Remotely  ·  Revenue Model  ·  CONFIDENTIAL", M, PH - 24, { lineBreak: false })
   .text("Page 4 of 5", M, PH - 24, { width: CW, align: "right", lineBreak: false });

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 5 — ROADMAP + STRATEGIC DIRECTION
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);
doc.rect(0, 0, PW, 48).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(13).fillColor(C.white)
   .text("Product Roadmap & Strategic Direction", M, 16, { lineBreak: false });

y = 68;
y = sectionHeading(y, "Phased Product Roadmap", "From beta launch to full AI-powered hiring OS");

// Phase cards — 2×2 grid
const phW = (CW - 12) / 2;
const phases: [string, string, string[], string][] = [
  ["1", "Foundation (Now → 3 months)", [
    "Privacy & Express Interest system",
    "Company dashboard — pipeline view + shortlists",
    "Placement fee tracking + Stripe invoicing",
    "Beta launch with core matching workflow",
  ], C.indigo],
  ["2", "Workflow (3–6 months)", [
    "Built-in interview scheduling (replaces Calendly)",
    "Embedded video interview rooms (replaces Zoom)",
    "Structured interview scorecards",
    "Offer letters with e-signature",
  ], "#7C3AED"],
  ["3", "AI Layer (6–12 months)", [
    "AI async screening interviews (HireVue-style)",
    "AI matching engine trained on past placements",
    "AI interview copilot — live transcription + suggestions",
    "AI candidate coaching (drives candidate premium)",
  ], "#0891B2"],
  ["4", "Platform (12+ months)", [
    "ATS integrations (Greenhouse, Lever)",
    "Background checks (Checkr partnership)",
    "Payroll partnerships (Deel, Remote.com referral)",
    "Talent intelligence reports for VCs + HR teams",
  ], C.green],
];

phases.forEach(([num, title, items, color], i) => {
  const px = M + (i % 2) * (phW + 12);
  const py = y + Math.floor(i / 2) * 116;
  phaseCard(px, py, phW, num, title, items, color);
});
y += 248;

rule(y); y += 16;

// Strategic direction
y = sectionHeading(y, "Final Strategic Direction");

const pillars = [
  { title: "Not a Job Board", body: "Job boards earn from listings. HMR earns from outcomes. Every feature is built around the placement, not the posting." },
  { title: "Not a Social Network", body: "LinkedIn earns from attention and subscriptions. HMR earns from hires. Engagement is a means to an end, not the product." },
  { title: "The Hiring OS", body: "End-to-end remote hiring operating system — discovery, screening, introduction, interviews, offers, onboarding. All in one place." },
];

const pillarW = (CW - 16) / 3;
pillars.forEach((p, i) => {
  const px = M + i * (pillarW + 8);
  doc.roundedRect(px, y, pillarW, 86, 5).fill(C.indigoLight);
  doc.rect(px, y, pillarW, 4).fill(C.indigo);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.indigo)
     .text(p.title, px + 12, y + 14, { width: pillarW - 24, lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor(C.gray700)
     .text(p.body, px + 12, y + 30, { width: pillarW - 24 });
});
y += 100;

// Final tagline banner
doc.roundedRect(M, y, CW, 60, 8).fill(C.indigoDark);
doc.font("Helvetica-Bold").fontSize(14).fillColor(C.white)
   .text('"HMR is the only remote hiring platform that earns on the outcome, not the activity."', M + 24, y + 16, { width: CW - 48, align: "center" });
y += 74;

rule(y); y += 14;

// Summary stats strip
const summaryStats = [
  ["~$776K",         "Year 1 target revenue"],
  ["$3K–$20K",       "Per placement earned"],
  ["4 streams",      "Diversified revenue"],
  ["Phase 1–4",      "Roadmap to hiring OS"],
];
const ssW = CW / 4;
summaryStats.forEach(([val, lbl], i) => {
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.indigo)
     .text(val, M + i * ssW, y, { width: ssW, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
     .text(lbl, M + i * ssW, y + 18, { width: ssW, align: "center", lineBreak: false });
});

rule(PH - 32);
doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
   .text("Hire Me Remotely  ·  Revenue Model  ·  CONFIDENTIAL", M, PH - 24, { lineBreak: false })
   .text("Page 5 of 5", M, PH - 24, { width: CW, align: "right", lineBreak: false });

// ─────────────────────────────────────────────────────────────────────────────
doc.end();
stream.on("finish", () => {
  console.log(`PDF written to: ${OUT}`);
});
stream.on("error", (err: Error) => {
  console.error("Stream error:", err);
  process.exit(1);
});
