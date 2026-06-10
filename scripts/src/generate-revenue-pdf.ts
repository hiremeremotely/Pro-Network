import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../../.local/hmr-revenue-model.pdf");

const C = {
  indigo:      "#4F46E5",
  indigoDark:  "#3730A3",
  indigoMid:   "#818CF8",
  indigoLight: "#EEF2FF",
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
};

const PW = 612;
const PH = 792;
const M  = 52;
const CW = PW - M * 2;
const BODY_BOTTOM = PH - 52; // page break threshold

const doc = new PDFDocument({ size: "LETTER", margin: 0, info: {
  Title:   "Hire Me Remotely — Revenue Model",
  Author:  "Hire Me Remotely",
  Subject: "Year 1 Revenue Projection",
} });

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────

let y = 0;

function newPage() {
  doc.addPage();
  doc.rect(0, 0, PW, PH).fill(C.white);
  // indigo header bar
  doc.rect(0, 0, PW, 44).fill(C.indigo);
  y = 60;
}

function checkBreak(needed = 60) {
  if (y + needed > BODY_BOTTOM) newPage();
}

function hLine(at?: number, color = C.gray300) {
  const ly = at ?? y;
  doc.moveTo(M, ly).lineTo(PW - M, ly).strokeColor(color).lineWidth(0.5).stroke();
}

function footerLine(pageLabel: string) {
  hLine(PH - 30, C.gray300);
  doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
     .text("Hire Me Remotely  ·  Revenue Model  ·  CONFIDENTIAL", M, PH - 22, { lineBreak: false })
     .text(pageLabel, 0, PH - 22, { width: PW - M, align: "right", lineBreak: false });
}

// Draw text at current y, advance y by the rendered height
function para(text: string, opts: {
  font?: string; size?: number; color?: string;
  x?: number; width?: number; align?: "left"|"center"|"right";
  lineGap?: number;
} = {}): void {
  const { font = "Helvetica", size = 9.5, color = C.gray700,
          x = M, width = CW, align = "left", lineGap = 2 } = opts;
  doc.font(font).fontSize(size).fillColor(color);
  doc.text(text, x, y, { width, align, lineGap });
  y = doc.y + 2;
}

// Section heading with indigo left bar
function heading(title: string, sub?: string) {
  checkBreak(sub ? 54 : 40);
  doc.rect(M, y, 4, sub ? 32 : 20).fill(C.indigo);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.gray900)
     .text(title, M + 14, y, { lineBreak: false });
  if (sub) {
    doc.font("Helvetica").fontSize(8).fillColor(C.gray500)
       .text(sub, M + 14, y + 18, { lineBreak: false });
  }
  y += sub ? 46 : 30;
}

// Full-width callout box; returns new y
function callout(text: string, bg: string, fg: string, label?: string) {
  checkBreak(50);
  const startY = y;
  // estimate height: ~12px per ~100 chars at 9pt in CW-28 width
  doc.roundedRect(M, startY, CW, 8, 3).fill(bg); // placeholder height
  doc.font("Helvetica").fontSize(8.5).fillColor(fg);
  if (label) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(fg)
       .text(label, M + 12, startY + 8, { lineBreak: false });
    doc.font("Helvetica").fontSize(8.5).fillColor(fg)
       .text(text, M + 12, startY + 20, { width: CW - 24 });
  } else {
    doc.text(text, M + 12, startY + 10, { width: CW - 24 });
  }
  const endY = doc.y + 10;
  // redraw background with correct height
  doc.roundedRect(M, startY, CW, endY - startY, 5).fill(bg);
  // rewrite text on top
  if (label) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(fg)
       .text(label, M + 12, startY + 8, { lineBreak: false });
    doc.font("Helvetica").fontSize(8.5).fillColor(fg)
       .text(text, M + 12, startY + 20, { width: CW - 24 });
  } else {
    doc.font("Helvetica").fontSize(8.5).fillColor(fg)
       .text(text, M + 12, startY + 10, { width: CW - 24 });
  }
  y = endY + 6;
}

// Simple table: returns new y
function drawTable(
  headers: string[],
  rows: string[][],
  colW: number[],
  opts: {
    headerBg?: string; headerFg?: string;
    rowH?: number; fontSize?: number;
    boldFirstCol?: boolean;
  } = {}
) {
  const { headerBg = C.indigo, headerFg = C.white,
          rowH = 24, fontSize = 8.5, boldFirstCol = true } = opts;
  const totalW = colW.reduce((a, b) => a + b, 0);

  checkBreak(rowH * (rows.length + 1) + 8);

  // header
  doc.rect(M, y, totalW, rowH).fill(headerBg);
  let cx = M;
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(headerFg)
       .text(h, cx + 7, y + (rowH - fontSize * 1.2) / 2, { width: colW[i] - 14, lineBreak: false });
    cx += colW[i];
  });
  y += rowH;

  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? C.white : C.gray100;
    doc.rect(M, y, totalW, rowH).fill(bg);
    cx = M;
    row.forEach((cell, ci) => {
      const bold = boldFirstCol && ci === 0;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica")
         .fontSize(fontSize).fillColor(C.gray700)
         .text(cell, cx + 7, y + (rowH - fontSize * 1.2) / 2, { width: colW[ci] - 14, lineBreak: false });
      cx += colW[ci];
    });
    doc.rect(M, y, totalW, rowH).strokeColor(C.gray300).lineWidth(0.3).stroke();
    y += rowH;
  });

  doc.rect(M, y - rowH * rows.length - rowH, totalW, rowH * rows.length + rowH)
     .strokeColor(C.gray300).lineWidth(0.5).stroke();
  y += 6;
}

// Highlighted total row appended after table
function totalRow(cells: string[], colW: number[]) {
  const totalW = colW.reduce((a, b) => a + b, 0);
  doc.rect(M, y, totalW, 26).fill(C.indigoLight);
  let cx = M;
  cells.forEach((cell, i) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.indigo)
       .text(cell, cx + 7, y + 8, { width: colW[i] - 14, lineBreak: false });
    cx += colW[i];
  });
  doc.rect(M, y, totalW, 26).strokeColor(C.indigo).lineWidth(0.8).stroke();
  y += 32;
}

// Metric strip: array of [value, label]
function metricStrip(items: [string, string][], bg = C.indigoLight, fg = C.indigo) {
  const w = CW / items.length;
  items.forEach(([val, lbl], i) => {
    doc.roundedRect(M + i * w + (i > 0 ? 4 : 0), y, w - (i > 0 ? 4 : 0), 62, 5).fill(bg);
    doc.font("Helvetica-Bold").fontSize(18).fillColor(fg)
       .text(val, M + i * w, y + 10, { width: w, align: "center", lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(C.gray600 ?? C.gray700)
       .text(lbl, M + i * w, y + 36, { width: w, align: "center", lineBreak: false });
  });
  y += 72;
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ═════════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, PW, PH).fill(C.indigoDark);

// Decorative circles
doc.save().opacity(0.12).circle(PW - 40, 100, 200).fill(C.white).restore();
doc.save().opacity(0.07).circle(60, PH - 80, 240).fill(C.white).restore();

// Logo block
doc.roundedRect(M, 64, 50, 50, 8).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(26).fillColor(C.white).text("HMR", M + 5, 76, { lineBreak: false });
doc.font("Helvetica-Bold").fontSize(12).fillColor(C.indigoMid)
   .text("Hire Me Remotely", M + 60, 72, { lineBreak: false });
doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.45)")
   .text("hiremeremotely.com", M + 60, 89, { lineBreak: false });

doc.moveTo(M, 136).lineTo(PW - M, 136).strokeColor("rgba(255,255,255,0.15)").lineWidth(0.5).stroke();

// Title
doc.font("Helvetica-Bold").fontSize(36).fillColor(C.white).text("Revenue Model", M, 158, { lineBreak: false });
doc.font("Helvetica-Bold").fontSize(36).fillColor(C.indigoMid).text("& Financial Forecast", M, 200, { lineBreak: false });
doc.font("Helvetica").fontSize(12).fillColor("rgba(255,255,255,0.6)")
   .text("Year 1 Conservative Projection  ·  Business Model Overview  ·  Strategic Roadmap", M, 250, { width: CW });

// Hero metric box
doc.roundedRect(M, 290, CW, 100, 8).fill("rgba(255,255,255,0.07)");
doc.moveTo(M, 290).lineTo(PW - M, 290).lineTo(PW - M, 390).lineTo(M, 390).closePath()
   .strokeColor("rgba(255,255,255,0.15)").lineWidth(0.5).stroke();
doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.45)")
   .text("YEAR 1 CONSERVATIVE REVENUE TARGET", M + 22, 308, { lineBreak: false });
doc.font("Helvetica-Bold").fontSize(48).fillColor(C.white).text("~$776,000", M + 22, 322, { lineBreak: false });
doc.font("Helvetica").fontSize(9).fillColor(C.indigoMid)
   .text("4 revenue streams  ·  Conservative assumptions  ·  No enterprise contracts counted", M + 22, 378, { lineBreak: false });

// 4 stats
const coverStats: [string, string][] = [["$12,600", "Avg placement fee"], ["$500/mo", "Avg company plan"], ["120", "Hires Year 1"], ["4", "Revenue streams"]];
coverStats.forEach(([val, lbl], i) => {
  const sx = M + i * (CW / 4);
  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.white)
     .text(val, sx, 408, { width: CW / 4, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor("rgba(255,255,255,0.45)")
     .text(lbl, sx, 430, { width: CW / 4, align: "center", lineBreak: false });
});

// Tagline
doc.roundedRect(M, 462, CW, 56, 8).fill("rgba(255,255,255,0.05)");
doc.font("Helvetica").fontSize(12).fillColor("rgba(255,255,255,0.82)")
   .text('"LinkedIn lets companies fish in the ocean themselves.\nHMR catches the fish and delivers them to the dock."',
         M + 20, 476, { width: CW - 40, align: "center" });

// Tag chips
const tagChips = ["Managed Placement Broker", "Remote-Only Focus", "Success-Fee Revenue", "End-to-End Hiring OS"];
let chipX = M;
doc.font("Helvetica-Bold").fontSize(7.5);
tagChips.forEach(label => {
  const w = doc.widthOfString(label) + 18;
  doc.roundedRect(chipX, 532, w, 17, 8).fill("rgba(255,255,255,0.1)");
  doc.fillColor(C.white).text(label, chipX + 9, 536.5, { lineBreak: false });
  chipX += w + 6;
});

// Footer
doc.moveTo(M, PH - 60).lineTo(PW - M, PH - 60).strokeColor("rgba(255,255,255,0.1)").lineWidth(0.5).stroke();
doc.font("Helvetica").fontSize(7.5).fillColor("rgba(255,255,255,0.3)")
   .text("CONFIDENTIAL  ·  Internal Use Only", M, PH - 48, { lineBreak: false });
const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
doc.text(`Prepared: ${dateStr}`, 0, PH - 48, { width: PW - M, align: "right", lineBreak: false });

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 2 — BUSINESS MODEL + STREAM 1 & 2
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);
doc.rect(0, 0, PW, 44).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(12).fillColor(C.white)
   .text("Business Model & Revenue Streams", M, 14, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.indigoMid)
   .text("Pages 2–3 of 5", 0, 18, { width: PW - M, align: "right", lineBreak: false });
y = 60;

// Business model
heading("Our Model: Managed Remote Placement");
callout(
  "HMR operates as a managed placement broker — not an open job board. Candidates build profiles on the platform. " +
  "Companies discover and express interest in candidates through HMR. Every introduction is mediated by HMR, which " +
  "means HMR earns a success fee on every confirmed hire and retains the relationship with both sides.",
  C.gray100, C.gray700
);

// Two-column strip
const colH = 38;
doc.roundedRect(M, y, CW / 2 - 6, colH, 5).fill(C.indigoLight);
doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.indigo)
   .text("LINKEDIN MODEL", M + 12, y + 7, { lineBreak: false });
doc.font("Helvetica").fontSize(8.5).fillColor(C.gray700)
   .text("Open network → direct contact → earns ~$0 per hire", M + 12, y + 19, { width: CW / 2 - 28, lineBreak: false });

doc.roundedRect(M + CW / 2 + 6, y, CW / 2 - 6, colH, 5).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.indigoMid)
   .text("HMR MODEL", M + CW / 2 + 18, y + 7, { lineBreak: false });
doc.font("Helvetica").fontSize(8.5).fillColor(C.white)
   .text("Mediated broker → every hire tracked → earns $3k–$20k per placement", M + CW / 2 + 18, y + 19, { width: CW / 2 - 28, lineBreak: false });
y += colH + 16;

hLine(); y += 14;

// Stream 1
heading("Stream 1 — Placement Fees", "Primary revenue driver · High value per transaction");

callout(
  "Companies already pay traditional recruiters $10,000–$30,000 per hire. HMR delivers a vetted, remote-ready pipeline " +
  "at a competitive rate with full process ownership — no self-sourcing required.",
  C.greenLight, C.green, "Why it works:"
);

drawTable(
  ["Seniority Tier", "Salary Range", "HMR Fee %", "Example Fee (illustrative)"],
  [
    ["Junior / Mid",            "< $60,000",        "8–10%",   "~$5,000"],
    ["Senior / Lead",           "$60,000–$120,000",  "12–15%",  "~$12,600"],
    ["Executive / Specialist",  "> $120,000",        "18–20%",  "~$24,000+"],
  ],
  [CW * 0.35, CW * 0.23, CW * 0.16, CW * 0.26],
  { rowH: 26 }
);

callout(
  "Example: A $90,000 remote engineering hire at 14%  =  $12,600 per placement",
  C.amberLight, C.amber
);

hLine(); y += 14;

// Stream 2
heading("Stream 2 — Company Subscriptions", "Recurring monthly / annual plans for regular hirers");

drawTable(
  ["Plan", "Price", "Active Jobs", "Requests/mo", "Included Features"],
  [
    ["Starter",    "$299/month",  "3",          "10",         "Standard support"],
    ["Growth",     "$799/month",  "Unlimited",  "50",         "Priority matching + analytics dashboard"],
    ["Enterprise", "Custom",      "Unlimited",  "Unlimited",  "Dedicated manager + ATS integration + custom SLAs"],
  ],
  [CW * 0.14, CW * 0.16, CW * 0.14, CW * 0.14, CW * 0.42],
  { rowH: 26, fontSize: 8 }
);

footerLine("Page 2 of 5");

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 3 — STREAMS 3–5 + YEAR 1 PROJECTION
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);
doc.rect(0, 0, PW, 44).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(12).fillColor(C.white)
   .text("Additional Revenue Streams & Year 1 Projection", M, 14, { lineBreak: false });
y = 60;

// Stream 3
heading("Stream 3 — Candidate Premium", "Optional upgrades · Free by default for all candidates");

// Two columns
const premW = CW / 2 - 8;
const premY = y;
doc.roundedRect(M, premY, premW, 90, 5).fill(C.gray100);
doc.font("Helvetica-Bold").fontSize(8).fillColor(C.gray700).text("PRICING", M + 12, premY + 10, { lineBreak: false });
doc.font("Helvetica-Bold").fontSize(24).fillColor(C.indigo).text("$9 – $19", M + 12, premY + 22, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.gray500).text("per candidate per month", M + 12, premY + 50, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.gray500).text("Free tier · no credit card required", M + 12, premY + 64, { lineBreak: false });
doc.font("Helvetica").fontSize(8).fillColor(C.gray500).text("Annual billing = 2 months free", M + 12, premY + 78, { lineBreak: false });

doc.roundedRect(M + premW + 16, premY, premW, 90, 5).fill(C.indigoLight);
doc.font("Helvetica-Bold").fontSize(8).fillColor(C.indigo).text("WHAT PREMIUM UNLOCKS", M + premW + 28, premY + 10, { lineBreak: false });
const premFeatures = [
  "Profile boost — higher in company search results",
  "\"Actively Looking\" badge — signals urgency",
  "Application analytics — who viewed your profile",
  "Priority review by HMR matching team",
  "AI interview prep (Phase 3)",
];
premFeatures.forEach((f, i) => {
  doc.font("Helvetica").fontSize(8).fillColor(C.gray700)
     .text(`• ${f}`, M + premW + 28, premY + 24 + i * 13, { width: premW - 20, lineBreak: false });
});
y = premY + 98;

hLine(); y += 14;

// Stream 4
heading("Stream 4 — Featured Job Listings", "Ad-style placements · Low-touch · High margin");

drawTable(
  ["Listing Type", "Price", "Duration", "What's Included"],
  [
    ["Standard Featured",  "$99/week",   "7 days",  "Pinned at top of job board"],
    ["Premium Featured",   "$199/week",  "7 days",  "Pinned + highlighted + email blast to matched candidates"],
    ["Sponsored Bundle",   "$299/week",  "7 days",  "All above + social post + newsletter mention"],
  ],
  [CW * 0.24, CW * 0.14, CW * 0.12, CW * 0.50],
  { rowH: 26 }
);

hLine(); y += 14;

// Stream 5
heading("Stream 5 — Talent Reports & Market Intelligence", "B2B data product · Year 2+ · High margin");

callout(
  "Anonymised salary benchmarks, skills demand heatmaps, and remote hiring trend reports sold to HR teams, venture capital firms, " +
  "and industry analysts. Price range: $500–$5,000 per report. Activates in Year 2 once the dataset is large enough for meaningful insight.",
  C.gray100, C.gray700
);

hLine(); y += 14;

// Year 1 Projection
heading("Year 1 Conservative Revenue Projection", "Based on conservative volume assumptions — no enterprise contracts included");

drawTable(
  ["Revenue Stream", "Volume Assumption", "Unit Value", "Year 1 Revenue"],
  [
    ["Placement Fees",         "10 hires/month × 12 months",    "~$5,000 avg",   "$600,000"],
    ["Company Subscriptions",  "20 companies × 12 months",      "$500/mo avg",   "$120,000"],
    ["Candidate Premium",      "200 subscribers × 12 months",   "$12/mo avg",    "$28,800"],
    ["Featured Job Listings",  "15 listings/month × 12 months", "$150 avg",      "$27,000"],
    ["Talent Reports",         "Year 2+ only",                  "—",             "$0"],
  ],
  [CW * 0.28, CW * 0.28, CW * 0.18, CW * 0.26],
  { rowH: 26 }
);
totalRow(["Total Year 1 Revenue", "", "", "~$775,800"], [CW * 0.28, CW * 0.28, CW * 0.18, CW * 0.26]);

metricStrip([
  ["$600K",  "Placement Fees (80%)"],
  ["$120K",  "Subscriptions (15%)"],
  ["$28.8K", "Candidate Premium (4%)"],
  ["$27K",   "Featured Listings (3%)"],
]);

footerLine("Page 3 of 5");

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 4 — HMR vs LINKEDIN
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);
doc.rect(0, 0, PW, 44).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(12).fillColor(C.white)
   .text("HMR vs LinkedIn — Competitive Analysis", M, 14, { lineBreak: false });
y = 60;

heading("Platform Comparison", "How HMR differs fundamentally from LinkedIn's model");

// Custom 3-col comparison table
const compRows: [string, string, string][] = [
  ["Business model",           "Open social network + job board",                 "Managed placement broker"],
  ["Controls candidate data",  "LinkedIn (companies contact directly)",           "HMR — companies cannot contact directly"],
  ["Contact method",           "InMail direct to candidate",                      "All introductions mediated by HMR"],
  ["Candidate database",       "Semi-public, accessible to all subscribers",      "Proprietary — HMR controls access"],
  ["Recruiter cost",           "$8,000–$16,000/yr + company sources themselves",  "Subscription + placement fee → vetted shortlists"],
  ["Revenue per hire",         "~$0 — LinkedIn earns nothing per placement",      "$3,000–$20,000 per confirmed placement"],
  ["Remote focus",             "No — general professional network",               "Yes — remote-only specialisation"],
  ["Candidate experience",     "Spam from hundreds of recruiters",                "Only hears from HMR who vets every intro"],
  ["Defensibility",            "Scale and broad network effects",                 "Proprietary database + curated relationships"],
  ["Pre-screening",            "None — companies screen themselves",              "HMR pre-screens before any introduction"],
];

const c1 = 170, c2 = (CW - c1) / 2, c3 = (CW - c1) / 2;
const rh = 28;

// Header
doc.rect(M, y, c1, rh).fill(C.gray900);
doc.rect(M + c1, y, c2, rh).fill("#DC2626");
doc.rect(M + c1 + c2, y, c3, rh).fill(C.green);
["Dimension", "LinkedIn", "Hire Me Remotely"].forEach((lbl, i) => {
  const xs = [M + 8, M + c1 + 8, M + c1 + c2 + 8];
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white)
     .text(lbl, xs[i], y + 9, { lineBreak: false });
});
y += rh;

compRows.forEach((row, ri) => {
  const rowHeight = 26;
  const dimBg  = ri % 2 === 0 ? C.gray100 : C.white;
  const leftBg = ri % 2 === 0 ? "#FEF2F2" : "#FFF7F7";
  const rightBg= ri % 2 === 0 ? C.greenLight : "#F0FDF4";

  doc.rect(M, y, c1, rowHeight).fill(dimBg);
  doc.rect(M + c1, y, c2, rowHeight).fill(leftBg);
  doc.rect(M + c1 + c2, y, c3, rowHeight).fill(rightBg);

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.gray900)
     .text(row[0], M + 8, y + 9, { width: c1 - 16, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor("#B91C1C")
     .text(row[1], M + c1 + 8, y + 9, { width: c2 - 16, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor("#065F46")
     .text(row[2], M + c1 + c2 + 8, y + 9, { width: c3 - 16, lineBreak: false });

  doc.rect(M, y, CW, rowHeight).strokeColor(C.gray300).lineWidth(0.3).stroke();
  y += rowHeight;
});
doc.rect(M, 60 + 30 + rh, CW, y - (60 + 30 + rh)).strokeColor(C.gray300).lineWidth(0.5).stroke();
y += 16;

hLine(); y += 14;

heading("Unit Economics — Why HMR Wins");
callout(
  "Today a company pays LinkedIn Recruiter ($8,000–$16,000/year) PLUS a recruitment agency (15–25% per hire) — " +
  "up to $30,000+ per hire with no guaranteed outcome and full self-service sourcing.\n\n" +
  "HMR replaces both at a lower blended cost and delivers a curated, remote-ready shortlist with every introduction handled end-to-end.",
  C.indigoLight, C.indigo
);

footerLine("Page 4 of 5");

// ═════════════════════════════════════════════════════════════════════════════
// PAGE 5 — ROADMAP + STRATEGIC DIRECTION
// ═════════════════════════════════════════════════════════════════════════════
doc.addPage();
doc.rect(0, 0, PW, PH).fill(C.white);
doc.rect(0, 0, PW, 44).fill(C.indigo);
doc.font("Helvetica-Bold").fontSize(12).fillColor(C.white)
   .text("Product Roadmap & Strategic Direction", M, 14, { lineBreak: false });
y = 60;

heading("Phased Product Roadmap", "From beta launch to full AI-powered hiring OS");

const phW = (CW - 10) / 2;
const phases: [string, string, string[], string][] = [
  ["1", "Foundation — Now → 3 months", [
    "Privacy & Express Interest system",
    "Company dashboard: pipeline view + shortlists",
    "Placement fee tracking + Stripe invoicing",
    "Beta launch with core matching workflow",
  ], C.indigo],
  ["2", "Workflow — 3–6 months", [
    "Built-in interview scheduling (replaces Calendly)",
    "Embedded video interview rooms (replaces Zoom)",
    "Structured interview scorecards",
    "Offer letters with e-signature",
  ], "#7C3AED"],
  ["3", "AI Layer — 6–12 months", [
    "AI async screening interviews",
    "AI matching engine trained on past placements",
    "AI interview copilot — live transcription",
    "AI candidate coaching (drives premium)",
  ], "#0891B2"],
  ["4", "Platform — 12+ months", [
    "ATS integrations (Greenhouse, Lever)",
    "Background checks (Checkr partnership)",
    "Payroll partnerships (Deel, Remote.com referral)",
    "Talent intelligence reports for VCs + HR teams",
  ], C.green],
];

phases.forEach(([num, title, items, color], i) => {
  const px = M + (i % 2) * (phW + 10);
  const py = y + Math.floor(i / 2) * 118;
  const cardH = 26 + items.length * 16 + 10;
  doc.roundedRect(px, py, phW, cardH, 5).fill(C.gray100);
  doc.rect(px, py, phW, 26).fill(color);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("rgba(255,255,255,0.7)")
     .text(`PHASE ${num}`, px + 12, py + 5, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white)
     .text(title, px + 12, py + 14, { width: phW - 24, lineBreak: false });
  items.forEach((item, ii) => {
    doc.font("Helvetica").fontSize(8).fillColor(C.gray700)
       .text(`• ${item}`, px + 12, py + 34 + ii * 16, { width: phW - 24, lineBreak: false });
  });
});
y += 248;

hLine(); y += 16;

heading("Final Strategic Direction");

const pillars = [
  { title: "Not a Job Board",       body: "Job boards earn from listings. HMR earns from outcomes. Every feature is built around the confirmed placement, not the posting." },
  { title: "Not a Social Network",  body: "LinkedIn earns from attention and subscriptions. HMR earns from hires. Engagement is a means to an end, not the product itself." },
  { title: "The Hiring OS",         body: "End-to-end remote hiring operating system — discovery, screening, introduction, interviews, offers, onboarding. All in one platform." },
];
const pillarW = (CW - 12) / 3;
const pillarY = y;
pillars.forEach((p, i) => {
  const px = M + i * (pillarW + 6);
  doc.roundedRect(px, pillarY, pillarW, 86, 5).fill(C.indigoLight);
  doc.rect(px, pillarY, pillarW, 4).fill(C.indigo);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.indigo)
     .text(p.title, px + 12, pillarY + 14, { width: pillarW - 24, lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor(C.gray700)
     .text(p.body, px + 12, pillarY + 30, { width: pillarW - 24 });
});
y = pillarY + 96;

// Final tagline
doc.roundedRect(M, y, CW, 58, 8).fill(C.indigoDark);
doc.font("Helvetica-Bold").fontSize(13).fillColor(C.white)
   .text(
     '"HMR is the only remote hiring platform that earns on the outcome, not the activity."',
     M + 20, y + 16, { width: CW - 40, align: "center" }
   );
y += 70;

// Summary metric strip
const ssW = CW / 4;
["~$776K", "$3K–$20K", "4 streams", "Phase 1–4"].forEach((val, i) => {
  const labels = ["Year 1 Revenue Target", "Earned Per Placement", "Diversified Revenue", "Roadmap to Hiring OS"];
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.indigo)
     .text(val, M + i * ssW, y, { width: ssW, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor(C.gray500)
     .text(labels[i], M + i * ssW, y + 20, { width: ssW, align: "center", lineBreak: false });
});

footerLine("Page 5 of 5");

// ─────────────────────────────────────────────────────────────────────────────
doc.end();
stream.on("finish", () => console.log("PDF → " + OUT));
stream.on("error", (e: Error) => { console.error(e); process.exit(1); });
