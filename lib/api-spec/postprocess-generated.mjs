import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(currentDir, "..", "..");
const files = [
  path.join(root, "lib/api-client-react/src/generated/api.schemas.ts"),
  path.join(root, "lib/api-client-react/src/generated/api.ts"),
  path.join(root, "lib/api-zod/src/generated/api.ts"),
];

for (const file of files) {
  let content = await readFile(file, "utf8");
  if (file.endsWith("lib/api-zod/src/generated/api.ts")) {
    content = content.replace("import * as zod from 'zod';", "import * as zod from '../zod-compat';");
  }
  if (file.endsWith("lib/api-client-react/src/generated/api.ts")) {
    content = content.replaceAll(
      "if (h instanceof Headers) return Object.fromEntries(h.entries());",
      "if (h instanceof Headers) { const out: Record<string, string> = {}; h.forEach((value, key) => { out[key] = value; }); return out; }",
    );
  }
  await writeFile(file, `${content.trimEnd()}\n`);
}

await writeFile(
  path.join(root, "lib/api-zod/src/index.ts"),
  'export * from "./generated/api";\n',
);