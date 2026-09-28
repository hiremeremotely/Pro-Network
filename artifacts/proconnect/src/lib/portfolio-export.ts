export type ExportPlatform = "linkedin" | "behance" | "dribbble";

export type ExportProject = {
  row: number;
  title: string;
  description: string;
  projectUrl: string;
  tags: string[];
};

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 100;
const MAX_COLUMNS = 30;
const MAX_CELL = 5000;

export function validateExportFile(file: Pick<File, "name" | "size">) {
  if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose an extracted .csv file. ZIP archives and other formats are not supported.");
  if (file.size > MAX_BYTES) throw new Error("CSV files must be 2 MB or smaller.");
  if (!file.size) throw new Error("This file is empty.");
}

function parseCsv(text: string): string[][] {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("CSV files must be 2 MB or smaller.");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false, atStart = true;
  const pushCell = () => {
    row.push(cell.trim());
    if (row.length > MAX_COLUMNS) throw new Error(`CSV files can have at most ${MAX_COLUMNS} columns.`);
    cell = ""; closed = false; atStart = true;
  };
  const pushRow = () => {
    pushCell();
    if (row.some(value => value !== "")) rows.push(row);
    if (rows.length > MAX_ROWS + 1) throw new Error(`Import at most ${MAX_ROWS} project rows at a time.`);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"' && atStart) {
      quoted = true; atStart = false;
    } else if (char === "," || char === "\n" || char === "\r") {
      if (char === ",") pushCell();
      else { if (char === "\r" && text[i + 1] === "\n") i++; pushRow(); }
    } else if (closed && char !== " " && char !== "\t") {
      throw new Error("The CSV has unexpected text after a quoted value.");
    } else {
      cell += char;
      atStart = false;
    }
    if (cell.length > MAX_CELL) throw new Error(`CSV values can have at most ${MAX_CELL} characters.`);
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted value.");
  if (cell || row.length) pushRow();
  return rows;
}

export function exportProjectUrl(value: string, platform: ExportPlatform): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.href.length > 2048 || url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (platform === "linkedin") return host === "linkedin.com" && url.pathname.startsWith("/in/");
    if (platform === "behance") return host === "behance.net";
    return host === "dribbble.com";
  } catch { return false; }
}

export function parsePortfolioExport(text: string, platform: ExportPlatform): { projects: ExportProject[]; warnings: string[] } {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!rows.length) throw new Error("The CSV is empty.");
  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/[\s-]+/g, "_"));
  if (new Set(headers).size !== headers.length) throw new Error("The CSV has duplicate column headings.");
  const column = (...names: string[]) => names.map(name => headers.indexOf(name)).find(index => index >= 0) ?? -1;
  const titleIndex = platform === "linkedin" ? column("name") : column("title");
  if (titleIndex < 0) throw new Error(platform === "linkedin"
    ? "Expected LinkedIn's Projects.csv with a Name column."
    : "Expected a project CSV with a title column. Use the downloadable template.");
  const descriptionIndex = column("description");
  const urlIndex = platform === "linkedin" ? column("url") : column("project_url", "url");
  const tagsIndex = column("tags");
  const projects: ExportProject[] = [], warnings: string[] = [];
  if (rows.length - 1 > MAX_ROWS) throw new Error(`Import at most ${MAX_ROWS} project rows at a time.`);
  for (const [index, row] of rows.slice(1).entries()) {
    const number = index + 2;
    const value = (columnIndex: number) => columnIndex < 0 ? "" : row[columnIndex] ?? "";
    const title = value(titleIndex), description = value(descriptionIndex);
    const rawUrl = value(urlIndex);
    if (!title || title.length > 200 || description.length > MAX_CELL ||
      row.length > headers.length ||
      (tagsIndex >= 0 && value(tagsIndex).split(/[;|]/).some(tag => tag.trim().length > 50))) {
      warnings.push(`Row ${number} was skipped: check its title, description, tags, or column count.`);
      continue;
    }
    const projectUrl = exportProjectUrl(rawUrl, platform) ? rawUrl : "";
    if (rawUrl && !projectUrl) warnings.push(`Row ${number}: a URL outside the selected platform was not attached. Add it separately as a website link if appropriate.`);
    projects.push({
      row: number, title, description, projectUrl,
      tags: value(tagsIndex).split(/[;|]/).map(tag => tag.trim()).filter(Boolean).slice(0, 30),
    });
  }
  if (!projects.length) throw new Error(warnings.length ? `No valid projects found. ${warnings[0]}` : "No project rows were found.");
  return { projects, warnings };
}